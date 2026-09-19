import { partyApiUrl } from "@/lib/party-backend";
import type { Song } from "@/types/game";

async function parseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({})) as { error?: string };
  return data.error || fallback;
}

export async function loadSongs(): Promise<Song[]> {
  const url = partyApiUrl("/songs");
  if (!url) return [];

  try {
    const response = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json() as { songs?: Song[] };
    if (!Array.isArray(data.songs)) return [];
    return data.songs.filter((song) => song?.source?.type === "youtube" && Boolean(song.source.videoId));
  } catch {
    return [];
  }
}

export async function saveSong(song: Song) {
  const url = partyApiUrl("/songs");
  if (!url) throw new Error("Falta NEXT_PUBLIC_NEON_PARTY_FUNCTION_URL");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ song }),
  });

  if (!response.ok) throw new Error(await parseError(response, "No se pudo guardar el tema en Neon."));
}

export async function deleteSong(songId: string) {
  const url = partyApiUrl("/songs");
  if (!url) throw new Error("Falta NEXT_PUBLIC_NEON_PARTY_FUNCTION_URL");

  const response = await fetch(`${url}?id=${encodeURIComponent(songId)}`, {
    method: "DELETE",
    cache: "no-store",
  });

  if (!response.ok) throw new Error(await parseError(response, "No se pudo borrar el tema de Neon."));
}

export async function clearSongs() {
  const url = partyApiUrl("/songs");
  if (!url) throw new Error("Falta NEXT_PUBLIC_NEON_PARTY_FUNCTION_URL");

  const response = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!response.ok) throw new Error(await parseError(response, "No se pudo vaciar la biblioteca."));
}
