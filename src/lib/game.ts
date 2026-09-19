import type { AvatarKey, Player, Song } from "@/types/game";

export const AVATARS: AvatarKey[] = ["star", "guitar", "headphones", "disc", "gamepad", "radio", "crown", "bolt"];

export const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, 18);

export function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickFairSingers(
  players: Player[],
  stats: Record<string, { count: number; lastTurn: number }>,
  turn: number,
  amount: number
) {
  return [...players]
    .map((player) => {
      const stat = stats[player.name] ?? { count: 0, lastTurn: -999 };
      const recencyPenalty = Math.max(0, 3 - (turn - stat.lastTurn)) * 4;
      return { player, score: stat.count * 20 + recencyPenalty + Math.random() * 3 };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.min(amount, players.length))
    .map((entry) => entry.player.name);
}

export function pickSongOptions(pool: Song[], fallback: Song[]) {
  const source = pool.length >= 2 ? pool : fallback;
  return [...source].sort(() => Math.random() - 0.5).slice(0, 2);
}

export function extractYouTubeId(input: string) {
  const value = input.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0] ?? "";
    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] ?? "";
    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] ?? "";
    return url.searchParams.get("v") ?? "";
  } catch {
    return "";
  }
}
