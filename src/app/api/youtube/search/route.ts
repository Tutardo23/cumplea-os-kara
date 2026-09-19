import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const key = process.env.YOUTUBE_API_KEY;
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) return NextResponse.json({ error: "Falta q" }, { status: 400 });
  if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY no configurada" }, { status: 503 });

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "6");
  url.searchParams.set("q", `${query} karaoke letra`);
  url.searchParams.set("key", key);

  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) return NextResponse.json({ error: "YouTube no respondió correctamente" }, { status: response.status });

  const data = await response.json();
  const items = (data.items ?? []).map((item: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } } }) => ({
    id: item.id?.videoId ?? "",
    title: item.snippet?.title ?? "",
    channel: item.snippet?.channelTitle ?? "",
    thumbnail: item.snippet?.thumbnails?.medium?.url ?? "",
  }));

  return NextResponse.json({ items });
}
