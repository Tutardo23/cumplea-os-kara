"use client";

import YouTube from "react-youtube";
import type { Song } from "@/types/game";

export function KaraokePlayer({ song, onEnded }: { song: Song; onEnded?: () => void }) {
  return (
    <div className="relative h-full min-h-[520px] w-full overflow-hidden bg-black">
      <YouTube
        videoId={song.source.videoId}
        opts={{
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 1, rel: 0 },
        }}
        className="absolute inset-0 h-full w-full"
        iframeClassName="h-full w-full"
        onEnd={onEnded}
      />
    </div>
  );
}
