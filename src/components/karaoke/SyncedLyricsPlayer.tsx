"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import YouTube from "react-youtube";
import { FileText, MicOff, MicVocal, Pause, Play, RotateCcw, Video } from "lucide-react";
import { findActiveLine, parseLrc } from "@/lib/karaoke/lrc";

type YouTubePlayerApi = {
  mute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
};

export function SyncedLyricsPlayer({
  audioUrl,
  lyricsLrc,
  title,
  artist,
  defaultVocalReduction = false,
  visualVideoId,
  visualOffset = 0,
  onEnded,
}: {
  audioUrl: string;
  lyricsLrc?: string;
  title: string;
  artist: string;
  defaultVocalReduction?: boolean;
  visualVideoId?: string;
  visualOffset?: number;
  onEnded?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const videoPlayerRef = useRef<YouTubePlayerApi | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vocalReduction, setVocalReduction] = useState(defaultVocalReduction);
  const [audioGraphReady, setAudioGraphReady] = useState(false);
  const lines = useMemo(() => parseLrc(lyricsLrc), [lyricsLrc]);
  const activeIndex = findActiveLine(lines, time);
  const hasLyrics = lines.length > 0;
  const hasVisualVideo = Boolean(visualVideoId);

  const syncVideo = (force = false) => {
    const audio = audioRef.current;
    const video = videoPlayerRef.current;
    if (!audio || !video) return;
    const target = Math.max(0, audio.currentTime + visualOffset);
    const current = Number(video.getCurrentTime?.() ?? 0);
    if (force || Math.abs(current - target) > 0.8) video.seekTo(target, true);
    video.mute();
    if (audio.paused) video.pauseVideo();
    else video.playVideo();
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      setPlaying(true);
      syncVideo(true);
    };
    const onPause = () => {
      setPlaying(false);
      videoPlayerRef.current?.pauseVideo();
    };
    const onSeeked = () => syncVideo(true);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("seeked", onSeeked);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("seeked", onSeeked);
    };
  }, [visualOffset]);

  useEffect(() => {
    if (!hasVisualVideo || !playing) return;
    const id = window.setInterval(() => syncVideo(false), 1200);
    return () => window.clearInterval(id);
  }, [hasVisualVideo, playing, visualOffset]);

  const routeAudio = async (reduce: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;

    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    if (!sourceRef.current) sourceRef.current = ctx.createMediaElementSource(audio);
    const source = sourceRef.current;
    source.disconnect();

    if (!reduce) {
      source.connect(ctx.destination);
      setAudioGraphReady(true);
      return;
    }

    const splitter = ctx.createChannelSplitter(2);
    const left = ctx.createGain();
    const rightNegative = ctx.createGain();
    const monoLeft = ctx.createGain();
    const monoRight = ctx.createGain();
    const merger = ctx.createChannelMerger(2);
    const master = ctx.createGain();

    rightNegative.gain.value = -1;
    master.gain.value = 0.86;

    source.connect(splitter);
    splitter.connect(left, 0);
    splitter.connect(rightNegative, 1);
    left.connect(monoLeft);
    rightNegative.connect(monoLeft);
    left.connect(monoRight);
    rightNegative.connect(monoRight);
    monoLeft.connect(merger, 0, 0);
    monoRight.connect(merger, 0, 1);
    merger.connect(master);
    master.connect(ctx.destination);
    setAudioGraphReady(true);
  };

  const toggleVocalReduction = async () => {
    const next = !vocalReduction;
    setVocalReduction(next);
    await routeAudio(next);
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audioGraphReady && defaultVocalReduction) await routeAudio(true);
    if (audio.paused) await audio.play();
    else audio.pause();
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    syncVideo(true);
  };

  const previous = lines[activeIndex - 1]?.text ?? "";
  const active = lines[activeIndex]?.text ?? "";
  const next = lines[activeIndex + 1]?.text ?? "";
  const progress = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <div className="relative flex h-full min-h-[520px] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(255,209,0,.18),transparent_38%),linear-gradient(180deg,#001347_0%,#000823_100%)]">
      <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" preload="metadata" onEnded={onEnded} />

      {hasVisualVideo && (
        <div className="absolute inset-0 z-0 bg-black">
          <YouTube
            videoId={visualVideoId}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                rel: 0,
                playsinline: 1,
              },
            }}
            className="pointer-events-none absolute inset-0 h-full w-full"
            iframeClassName="h-full w-full scale-[1.01]"
            onReady={(event) => {
              const player = event.target as YouTubePlayerApi;
              videoPlayerRef.current = player;
              player.mute();
              syncVideo(true);
            }}
          />
          {hasLyrics && <div className="absolute inset-0 bg-[#000820]/64" />}
          {!hasLyrics && <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/80 to-transparent" />}
          {!hasLyrics && <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 to-transparent" />}
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between gap-6 border-b border-white/10 bg-[#000820]/58 px-8 py-6 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <p className="eyebrow">Karaoke Player</p>
            {hasVisualVideo && <Video className="h-4 w-4 text-[var(--boca-yellow)]" />}
          </div>
          <h3 className="font-display text-4xl font-black uppercase leading-none text-white">{title}</h3>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.22em] text-white/55">{artist}</p>
        </div>
        <button type="button" onClick={toggleVocalReduction} className={`icon-button ${vocalReduction ? "is-active" : ""}`} title="Reducción de voz experimental">
          {vocalReduction ? <MicOff /> : <MicVocal />}
        </button>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:px-12">
        {hasLyrics ? (
          <>
            <p className="max-w-4xl font-display text-[clamp(1.3rem,2.4vw,2.2rem)] font-bold uppercase text-white/28">{previous}</p>
            <p className="my-6 max-w-5xl font-display text-[clamp(2.5rem,6vw,6.8rem)] font-black uppercase leading-[.95] tracking-tight text-[var(--boca-yellow)] drop-shadow-[0_10px_40px_rgba(0,0,0,.72)]">{active || "Preparados"}</p>
            <p className="max-w-4xl font-display text-[clamp(1.5rem,3vw,2.8rem)] font-bold uppercase text-white/48">{next}</p>
          </>
        ) : hasVisualVideo ? (
          <div className="pointer-events-none absolute bottom-28 left-6 z-10 border border-white/10 bg-black/58 px-4 py-3 text-left backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--boca-yellow)]">Video sincronizado</p>
            <p className="mt-1 text-xs font-semibold text-white/55">El sonido sale del audio propio. El video de YouTube está muteado.</p>
          </div>
        ) : (
          <div className="max-w-2xl border border-white/10 bg-white/[.04] p-8">
            <FileText className="mx-auto h-10 w-10 text-[var(--boca-yellow)]" />
            <p className="mt-4 font-display text-4xl font-black uppercase">Sin letra visual</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/45">Podés agregar un video de YouTube o una letra LRC desde Karaoke Lab.</p>
          </div>
        )}
      </div>

      <div className="relative z-10 border-t border-white/10 bg-[#000820]/70 px-6 py-5 backdrop-blur-xl">
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-[var(--boca-yellow)] transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-center gap-3">
          <button type="button" className="icon-button" onClick={restart} title="Reiniciar">
            <RotateCcw />
          </button>
          <button type="button" className="primary-round-button" onClick={togglePlayback} title={playing ? "Pausar" : "Reproducir"}>
            {playing ? <Pause /> : <Play className="translate-x-[1px]" />}
          </button>
        </div>
      </div>
    </div>
  );
}

