"use client";

import YouTube from "react-youtube";
import type { Song } from "@/types/game";
import { SyncedLyricsPlayer } from "./SyncedLyricsPlayer";

export function KaraokePlayer({ song, onEnded }: { song: Song; onEnded?: () => void }) {
  if (song.source.type === "audio") {
    return (
      <SyncedLyricsPlayer
        audioUrl={song.source.audioUrl}
        lyricsLrc={song.source.lyricsLrc}
        title={song.title}
        artist={song.artist}
        defaultVocalReduction={song.source.vocalReduction}
        visualVideoId={song.source.visualVideoId}
        visualOffset={song.source.visualOffset}
        onEnded={onEnded}
      />
    );
  }

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
