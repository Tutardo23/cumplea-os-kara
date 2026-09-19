import type { AvatarKey } from "@/types/game";

export type PartySocketEvent = {
  type: string;
  payload?: Record<string, unknown>;
};

type PartySocketOptions = {
  roomCode: string;
  role: "host" | "player";
  name?: string;
  avatar?: AvatarKey;
  onEvent: (event: PartySocketEvent) => void;
  onStatus?: (connected: boolean) => void;
};

const baseUrl = () => (process.env.NEXT_PUBLIC_NEON_PARTY_FUNCTION_URL ?? "").replace(/\/$/, "");

export function partyApiUrl(path = "") {
  const base = baseUrl();
  if (!base) return "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function websocketUrl(options: PartySocketOptions) {
  const base = baseUrl();
  if (!base) return "";
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`;
  url.searchParams.set("room", options.roomCode);
  url.searchParams.set("role", options.role);
  if (options.name) url.searchParams.set("name", options.name);
  if (options.avatar) url.searchParams.set("avatar", options.avatar);
  return url.toString();
}

export class PartySocket {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private stopped = false;
  private retry = 0;
  private readonly options: PartySocketOptions;

  constructor(options: PartySocketOptions) {
    this.options = options;
  }

  connect() {
    if (this.stopped) return;
    const url = websocketUrl(this.options);
    if (!url) {
      this.options.onStatus?.(false);
      return;
    }

    const socket = new WebSocket(url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.retry = 0;
      this.options.onStatus?.(true);
      this.send("request_sync", {});
      this.startHeartbeat();
    });

    socket.addEventListener("message", (message) => {
      if (typeof message.data !== "string") return;
      try {
        const event = JSON.parse(message.data) as PartySocketEvent;
        if (event.type === "ping") return;
        this.options.onEvent(event);
      } catch {
        // Ignore malformed frames; a party control must never crash because of one packet.
      }
    });

    socket.addEventListener("close", () => {
      this.options.onStatus?.(false);
      this.stopHeartbeat();
      if (this.stopped) return;
      const delay = Math.min(600 * 2 ** this.retry, 8000);
      this.retry += 1;
      this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
    });

    socket.addEventListener("error", () => socket.close());
  }

  send(type: string, payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  close() {
    this.stopped = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => this.send("heartbeat", {}), 10_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }
}
