import { NextRequest, NextResponse } from "next/server";
import { extractYouTubeId } from "@/lib/game";

const NOISE_PATTERNS = [
  /\((?:official\s+)?karaoke(?:\s+version)?[^)]*\)/gi,
  /\[(?:official\s+)?karaoke(?:\s+version)?[^\]]*\]/gi,
  /\((?:lyrics?|letra|instrumental|sing\s*along)[^)]*\)/gi,
  /\[(?:lyrics?|letra|instrumental|sing\s*along)[^\]]*\]/gi,
  /\bkaraoke\b/gi,
  /\bcon\s+letra\b/gi,
  /\bletra\b/gi,
  /\blyrics?\b/gi,
  /\binstrumental\b/gi,
  /\bofficial\s+video\b/gi,
  /\bofficial\s+audio\b/gi,
  /\bhd\b/gi,
  /\b4k\b/gi,
];

function compact(value: string) {
  return value.replace(/\s+/g, " ").replace(/\s*[|•]+\s*$/g, "").trim();
}

function cleanTitle(value: string) {
  return compact(NOISE_PATTERNS.reduce((text, pattern) => text.replace(pattern, ""), value))
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[-–—|]\s*$/g, "")
    .trim();
}

function inferSongMetadata(rawTitle: string, channel: string) {
  const cleaned = cleanTitle(rawTitle);
  const separators = [" - ", " – ", " — ", " | "];

  for (const separator of separators) {
    const parts = cleaned.split(separator).map(compact).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0];
      const rest = parts.slice(1).join(" - ");
      if (first.length <= 70 && rest.length <= 120) {
        return { title: rest, artist: first };
      }
    }
  }

  const byMatch = cleaned.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) return { title: compact(byMatch[1]), artist: compact(byMatch[2]) };

  return { title: cleaned || rawTitle, artist: compact(channel) };
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  const videoId = extractYouTubeId(input);
  if (!videoId) return NextResponse.json({ error: "URL de YouTube inválida." }, { status: 400 });

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "No pude leer los datos de ese video." }, { status: 502 });
    }

    const data = await response.json() as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };

    const rawTitle = compact(data.title ?? "");
    const channel = compact(data.author_name ?? "");
    const inferred = inferSongMetadata(rawTitle, channel);

    return NextResponse.json({
      videoId,
      rawTitle,
      channel,
      thumbnailUrl: data.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      title: inferred.title,
      artist: inferred.artist,
    });
  } catch {
    return NextResponse.json({ error: "No pude consultar YouTube ahora." }, { status: 502 });
  }
}
