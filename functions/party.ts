import { attachDatabasePool, upgradeWebSocket } from "@neon/functions";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);

const BUCKET = "karaoke-assets";
const s3 = new S3Client({ forcePathStyle: true });

type LiveClient = {
  socket: WebSocket;
  room: string;
  role: "host" | "player";
  name?: string;
  avatar?: string;
};

type WireMessage = {
  type?: string;
  payload?: Record<string, unknown>;
};

const clients = new Set<LiveClient>();
let eventCursor: number | null = null;
let cursorInit: Promise<void> | null = null;
let polling = false;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function normalizeRoom(value: string | null) {
  return (value ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
}

function normalizeName(value: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 18);
}

function send(client: LiveClient, type: string, payload: unknown) {
  if (client.socket.readyState !== 1) return;
  client.socket.send(JSON.stringify({ type, payload }));
}

async function addEvent(room: string, eventType: string, payload: Record<string, unknown>) {
  await pool.query(
    "insert into party_events (room_code, event_type, payload) values ($1, $2, $3::jsonb)",
    [room, eventType, JSON.stringify(payload)],
  );
}

async function currentState(room: string) {
  const { rows } = await pool.query<{ state: Record<string, unknown> }>(
    "select state from party_rooms where room_code = $1 limit 1",
    [room],
  );
  return rows[0]?.state ?? null;
}

async function upsertPlayer(room: string, name: string, avatar = "star") {
  await pool.query(
    `insert into party_players (room_code, name, avatar, last_seen)
     values ($1, $2, $3, now())
     on conflict (room_code, name)
     do update set avatar = excluded.avatar, last_seen = now()`,
    [room, name, avatar],
  );
}

async function touchPlayer(room: string, name: string) {
  await pool.query(
    "update party_players set last_seen = now() where room_code = $1 and name = $2",
    [room, name],
  );
}

async function saveHostState(room: string, mode: "full" | "live", state: Record<string, unknown>) {
  if (mode === "full") {
    await pool.query(
      `insert into party_rooms (room_code, state, version, updated_at)
       values ($1, $2::jsonb, 1, now())
       on conflict (room_code)
       do update set state = excluded.state, version = party_rooms.version + 1, updated_at = now()`,
      [room, JSON.stringify(state)],
    );
    await addEvent(room, "sync_state", state);
    return;
  }

  await pool.query(
    `insert into party_rooms (room_code, state, version, updated_at)
     values ($1, $2::jsonb, 1, now())
     on conflict (room_code)
     do update set state = party_rooms.state || excluded.state, version = party_rooms.version + 1, updated_at = now()`,
    [room, JSON.stringify(state)],
  );
  await addEvent(room, "live_update", state);
}

async function ensureEventCursor() {
  if (eventCursor !== null) return;
  if (!cursorInit) {
    cursorInit = pool.query<{ id: string }>("select coalesce(max(id), 0)::text as id from party_events")
      .then(({ rows }) => { eventCursor = Number(rows[0]?.id ?? 0); });
  }
  await cursorInit;
}

async function pollEvents() {
  if (polling || clients.size === 0) return;
  polling = true;
  try {
    await ensureEventCursor();

    const { rows } = await pool.query<{
      id: string;
      room_code: string;
      event_type: string;
      payload: Record<string, unknown>;
    }>(
      `select id::text, room_code, event_type, payload
       from party_events
       where id > $1
       order by id asc
       limit 500`,
      [eventCursor],
    );

    for (const event of rows) {
      eventCursor = Math.max(eventCursor, Number(event.id));
      for (const client of clients) {
        if (client.room === event.room_code) send(client, event.event_type, event.payload);
      }
    }
  } catch (error) {
    console.error("party event poll failed", error);
  } finally {
    polling = false;
  }
}

const eventTimer = setInterval(() => void pollEvents(), 250);
eventTimer.unref?.();

const presenceTimer = setInterval(async () => {
  if (clients.size === 0) return;
  try {
    await pool.query("delete from party_players where last_seen < now() - interval '5 minutes'");
    const rooms = [...new Set([...clients].map((client) => client.room))];
    for (const room of rooms) {
      const { rows } = await pool.query<{ name: string; avatar: string }>(
        `select name, avatar
         from party_players
         where room_code = $1 and last_seen > now() - interval '32 seconds'
         order by joined_at asc`,
        [room],
      );
      for (const client of clients) {
        if (client.room === room) send(client, "presence_state", { players: rows });
      }
    }
  } catch (error) {
    console.error("presence refresh failed", error);
  }
}, 3000);
presenceTimer.unref?.();

const heartbeatTimer = setInterval(() => {
  for (const client of clients) send(client, "ping", { at: Date.now() });
}, 25_000);
heartbeatTimer.unref?.();

async function handleSocket(request: Request) {
  const url = new URL(request.url);
  const room = normalizeRoom(url.searchParams.get("room"));
  const role = url.searchParams.get("role") === "host" ? "host" : "player";
  const name = normalizeName(url.searchParams.get("name"));
  const avatar = (url.searchParams.get("avatar") ?? "star").slice(0, 24);

  if (!room) return new Response("room required", { status: 400 });
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("expected websocket upgrade", { status: 426 });
  }

  await ensureEventCursor();
  const { socket, response } = upgradeWebSocket(request);
  const client: LiveClient = { socket, room, role, name: name || undefined, avatar };
  clients.add(client);

  socket.addEventListener("open", () => {
    void (async () => {
      if (role === "player" && name) {
        await upsertPlayer(room, name, avatar);
        await addEvent(room, "new_player", { name, avatar });
      }
      const state = await currentState(room);
      if (state) send(client, "sync_state", state);
    })();
  });

  socket.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;
    void (async () => {
      let message: WireMessage;
      try {
        message = JSON.parse(event.data) as WireMessage;
      } catch {
        return;
      }

      const type = message.type ?? "";
      const payload = message.payload ?? {};

      if (type === "request_sync") {
        const state = await currentState(room);
        if (state) send(client, "sync_state", state);
        return;
      }

      if (type === "heartbeat") {
        if (role === "player" && name) await touchPlayer(room, name);
        return;
      }

      if (type === "host_state" && role === "host") {
        const mode = payload.mode === "live" ? "live" : "full";
        const state = payload.state;
        if (state && typeof state === "object" && !Array.isArray(state)) {
          await saveHostState(room, mode, state as Record<string, unknown>);
        }
        return;
      }

      const allowed = new Set([
        "song_vote",
        "hype_batch",
        "reaction",
        "rescue_offer",
        "duel_vote",
        "secret_vote",
        "power_draw_join",
        "fate_vote",
        "power_use",
      ]);
      if (!allowed.has(type)) return;
      await addEvent(room, type, payload);
      if (role === "player" && name) await touchPlayer(room, name);
    })().catch((error) => console.error("socket message failed", error));
  });

  socket.addEventListener("close", () => {
    clients.delete(client);
  });

  socket.addEventListener("error", () => {
    clients.delete(client);
  });

  return response;
}

type SongInput = {
  id: string;
  title: string;
  artist: string;
  source: { type: "youtube"; videoId: string };
};

async function getSongs() {
  const { rows } = await pool.query(
    `select id, title, artist, youtube_id
     from karaoke_songs
     where source_type = 'youtube' and coalesce(youtube_id, '') <> ''
     order by updated_at desc, id asc`,
  );
  return rows.map((row) => ({
    id: String(row.id),
    title: row.title ?? "Sin título",
    artist: row.artist ?? "",
    source: { type: "youtube" as const, videoId: row.youtube_id ?? "" },
  }));
}

async function upsertSong(song: SongInput) {
  if (!song?.id || !song?.title || song?.source?.type !== "youtube" || !song.source.videoId) {
    throw new Error("Tema inválido");
  }
  await pool.query(
    `insert into karaoke_songs
      (id, title, artist, source_type, youtube_id, updated_at)
     values ($1,$2,$3,'youtube',$4,now())
     on conflict (id)
     do update set
       title = excluded.title,
       artist = excluded.artist,
       source_type = 'youtube',
       youtube_id = excluded.youtube_id,
       updated_at = now()`,
    [
      String(song.id).slice(0, 120),
      String(song.title).slice(0, 240),
      String(song.artist ?? "").slice(0, 240),
      String(song.source.videoId).slice(0, 32),
    ],
  );
}

async function deleteSong(songId?: string | null) {
  if (songId) {
    await pool.query("delete from karaoke_songs where id = $1", [songId]);
    return;
  }
  await pool.query("delete from karaoke_songs");
}

function publicObjectUrl(key: string) {
  const endpoint = (process.env.AWS_ENDPOINT_URL_S3 ?? "").replace(/\/$/, "");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${endpoint}/${BUCKET}/${encodedKey}`;
}

async function createUploadUrl(request: Request) {
  const body = await request.json() as { filename?: string; contentType?: string };
  const original = String(body.filename ?? "audio.mp3");
  const safe = original.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "audio.mp3";
  const contentType = String(body.contentType ?? "audio/mpeg");
  if (!contentType.startsWith("audio/")) return json({ error: "Solo se permiten archivos de audio." }, 400);

  const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${safe}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }),
    { expiresIn: 900 },
  );

  return json({ uploadUrl, publicUrl: publicObjectUrl(key), key });
}

async function handleHttp(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");

  if (request.method === "GET" && (path === "" || path === "/" || path.endsWith("/health"))) {
    const { rows } = await pool.query("select now() as now");
    return json({ ok: true, database: true, now: rows[0]?.now });
  }

  if (path.endsWith("/songs") && request.method === "GET") return json({ songs: await getSongs() });
  if (path.endsWith("/songs") && request.method === "POST") {
    const body = await request.json() as { song?: SongInput };
    if (!body.song) return json({ error: "song required" }, 400);
    await upsertSong(body.song);
    return json({ ok: true });
  }
  if (path.endsWith("/songs") && request.method === "DELETE") {
    await deleteSong(url.searchParams.get("id"));
    return json({ ok: true, songs: await getSongs() });
  }

  if (path.endsWith("/upload-url") && request.method === "POST") return createUploadUrl(request);

  if (path.endsWith("/asset-url") && request.method === "GET") {
    const key = url.searchParams.get("key");
    if (!key) return json({ error: "key required" }, 400);
    const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
    return json({ downloadUrl });
  }

  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const path = new URL(request.url).pathname.replace(/\/$/, "");
      if (path.endsWith("/ws")) return await handleSocket(request);
      return await handleHttp(request);
    } catch (error) {
      console.error("party function failed", error);
      return json({ error: "Backend error" }, 500);
    }
  },
};
