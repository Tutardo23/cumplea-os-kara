"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  Ban,
  Bolt,
  Check,
  Flame,
  Gift,
  Heart,
  ListMusic,
  Mic2,
  RadioTower,
  RefreshCw,
  Skull,
  Swords,
  Trophy,
  UserPlus,
  UserRound,
  Vote,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Countdown } from "@/components/party/Countdown";
import { PlayerAvatar } from "@/components/party/PlayerAvatar";
import { AVATARS, normalizeName } from "@/lib/game";
import { PartySocket } from "@/lib/party-backend";
import type { AvatarKey, KaraokeMode, PlayerSession, PowerKind, PublicRoomState, ReactionKind } from "@/types/game";

const EMPTY_STATE: PublicRoomState = {
  phase: "LOBBY",
  sequence: 0,
  mode: "EXPRESS",
  players: [],
  currentSingers: [],
  songOptions: [],
  hype: 0,
  hypeTarget: 28,
  reactions: { fire: 0, heart: 0, clap: 0, skull: 0 },
  partyScores: {},
  performances: [],
  powers: {},
  powerSongChoices: [],
};

const MODE_PHONE_COPY: Record<KaraokeMode, { label: string; singer: string; audience: string }> = {
  EXPRESS: { label: "Karaoke Express", singer: "Te tocó. Prepará la voz.", audience: "Sale una persona. Vos ayudás a elegir el tema." },
  DUO: { label: "Dúo Sorpresa", singer: "Te tocó en dupla. Mirá quién sube con vos.", audience: "Dos personas al escenario y ustedes eligen qué cantan." },
  BOMB: { label: "Tema Bomba", singer: "Te tocó y no elegís tema. Entra directo.", audience: "No hay votación. El tema aparece de golpe." },
  RESCUE: { label: "Rescate", singer: "Te tocó. Alguien puede ofrecerse para acompañarte.", audience: "Podés ofrecerte para subir a cantar con quien salió." },
  DUEL: { label: "Duelo", singer: "Te tocó un duelo. Después el público decide.", audience: "Dos cantan. Al final elegís quién se quedó con el show." },
};

const POWER_PHONE_COPY: Record<PowerKind, { label: string; detail: string }> = {
  PASS: { label: "Paso libre", detail: "Si te toca cantar, podés gastar este poder y salir del turno." },
  DECIDE: { label: "Última palabra", detail: "Cuando te toque, elegís una de las dos canciones y cerrás la votación." },
  REROLL: { label: "Cambio total", detail: "Cuando te toque, cambiás las dos opciones por otras." },
  FREE_PICK: { label: "Carta blanca", detail: "Cuando te toque, elegís directamente cualquier tema de la biblioteca." },
};

const reactionButtons: Array<{ kind: ReactionKind; label: string; icon: typeof Flame }> = [
  { kind: "fire", label: "Fuego", icon: Flame },
  { kind: "heart", label: "Banco", icon: Heart },
  { kind: "clap", label: "Aplauso", icon: Activity },
  { kind: "skull", label: "Caos", icon: Skull },
];

export default function PartyController() {
  const params = useParams();
  const roomCode = String(params.roomCode ?? "MACHI");
  const socketRef = useRef<PartySocket | null>(null);
  const sessionRef = useRef<PlayerSession | null>(null);
  const pendingHypeRef = useRef(0);
  const lastReactionRef = useRef<Record<string, number>>({});

  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftAvatar, setDraftAvatar] = useState<AvatarKey>("star");
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<PublicRoomState>(EMPTY_STATE);
  const [localHype, setLocalHype] = useState(0);
  const [votedSongKey, setVotedSongKey] = useState("");
  const [rescueOfferKey, setRescueOfferKey] = useState("");
  const [duelVoteKey, setDuelVoteKey] = useState("");
  const [secretVoteKey, setSecretVoteKey] = useState("");
  const [powerDrawKey, setPowerDrawKey] = useState("");
  const [fateVoteKey, setFateVoteKey] = useState("");
  const [freePickOpen, setFreePickOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`machis-night-player-${roomCode}`);
      if (raw) {
        const saved = JSON.parse(raw) as PlayerSession;
        if (saved?.name) {
          setSession(saved);
          setDraftName(saved.name);
          setDraftAvatar(saved.avatar || "star");
        }
      }
    } catch {
      // Start without a saved profile.
    }
    setHydrated(true);
  }, [roomCode]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!hydrated) return;
    const socket = new PartySocket({
      roomCode,
      role: "player",
      name: session?.name,
      avatar: session?.avatar,
      onEvent: ({ type, payload = {} }) => {
        if (type === "sync_state") {
          setState(payload as unknown as PublicRoomState);
          return;
        }
        if (type === "live_update") setState((prev) => ({ ...prev, ...payload } as PublicRoomState));
      },
      onStatus: setConnected,
    });
    socketRef.current = socket;
    socket.connect();
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [hydrated, roomCode, session?.name, session?.avatar]);

  useEffect(() => {
    if (state.phase === "DRAW" && session && state.currentSingers.includes(session.name)) navigator.vibrate?.([80, 45, 140]);
    if (["RESCUE_CALL", "DUEL_VOTE", "SECRET_VOTE", "POWER_DRAW", "FATE_VOTE", "SPECIAL_REVEAL"].includes(state.phase)) navigator.vibrate?.(60);
  }, [state.sequence, state.phase, state.currentSingers, session]);

  useEffect(() => {
    if (state.songVoteKey !== votedSongKey) setVotedSongKey("");
    if (state.rescue?.key !== rescueOfferKey) setRescueOfferKey("");
    if (state.duelVote?.key !== duelVoteKey) setDuelVoteKey("");
    if (state.secretVote?.key !== secretVoteKey) setSecretVoteKey("");
    if (state.powerDraw?.key !== powerDrawKey) setPowerDrawKey("");
    if (state.fateVote?.key !== fateVoteKey) setFateVoteKey("");
    if (state.phase !== "SONG_VOTE") setFreePickOpen(false);
    if (state.phase !== "SINGING") {
      pendingHypeRef.current = 0;
      setLocalHype(0);
    }
  }, [state.sequence, state.songVoteKey, state.rescue?.key, state.duelVote?.key, state.secretVote?.key, state.powerDraw?.key, state.fateVote?.key, votedSongKey, rescueOfferKey, duelVoteKey, secretVoteKey, powerDrawKey, fateVoteKey, state.phase]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const socket = socketRef.current;
      const current = sessionRef.current;
      if (!socket || !current || pendingHypeRef.current <= 0) return;
      const delta = pendingHypeRef.current;
      pendingHypeRef.current = 0;
      socket.send("hype_batch", { name: current.name, delta });
    }, 300);
    return () => window.clearInterval(id);
  }, []);

  const join = (event: React.FormEvent) => {
    event.preventDefault();
    const name = normalizeName(draftName);
    if (!name) return;
    const next = { name, avatar: draftAvatar };
    setSession(next);
    try {
      window.localStorage.setItem(`machis-night-player-${roomCode}`, JSON.stringify(next));
    } catch {
      // Session still works in this tab.
    }
  };

  const position = useMemo(() => {
    if (!session) return 0;
    return (Object.entries(state.partyScores) as Array<[string, number]>)
      .sort((a, b) => b[1] - a[1])
      .findIndex(([name]) => name === session.name) + 1;
  }, [session, state.partyScores]);

  const score = session ? state.partyScores[session.name] ?? 0 : 0;
  const isSinging = session ? state.currentSingers.includes(session.name) : false;
  const myPower = session ? state.powers?.[session.name] : undefined;
  const modeCopy = MODE_PHONE_COPY[state.mode] ?? MODE_PHONE_COPY.EXPRESS;

  const sendSongVote = (option: 0 | 1) => {
    if (!session || !state.songVoteKey || votedSongKey === state.songVoteKey) return;
    setVotedSongKey(state.songVoteKey);
    navigator.vibrate?.(35);
    socketRef.current?.send("song_vote", { key: state.songVoteKey, name: session.name, option });
  };

  const sendRescueOffer = () => {
    if (!session || !state.rescue || rescueOfferKey === state.rescue.key || isSinging) return;
    setRescueOfferKey(state.rescue.key);
    navigator.vibrate?.([40, 30, 80]);
    socketRef.current?.send("rescue_offer", { key: state.rescue.key, name: session.name });
  };

  const sendDuelVote = (option: 0 | 1) => {
    if (!session || !state.duelVote || duelVoteKey === state.duelVote.key || isSinging) return;
    setDuelVoteKey(state.duelVote.key);
    navigator.vibrate?.(35);
    socketRef.current?.send("duel_vote", { key: state.duelVote.key, name: session.name, option });
  };

  const sendSecretVote = (target: string) => {
    if (!session || !state.secretVote || secretVoteKey === state.secretVote.key || target === session.name) return;
    setSecretVoteKey(state.secretVote.key);
    navigator.vibrate?.([30, 25, 70]);
    socketRef.current?.send("secret_vote", { key: state.secretVote.key, name: session.name, target });
  };

  const joinPowerDraw = () => {
    if (!session || !state.powerDraw || powerDrawKey === state.powerDraw.key) return;
    setPowerDrawKey(state.powerDraw.key);
    navigator.vibrate?.([45, 25, 80]);
    socketRef.current?.send("power_draw_join", { key: state.powerDraw.key, name: session.name });
  };

  const sendFateVote = (option: 0 | 1) => {
    if (!session || !state.fateVote || fateVoteKey === state.fateVote.key) return;
    setFateVoteKey(state.fateVote.key);
    navigator.vibrate?.(40);
    socketRef.current?.send("fate_vote", { key: state.fateVote.key, name: session.name, option });
  };

  const usePower = (kind: PowerKind, extra: Record<string, unknown> = {}) => {
    if (!session || myPower !== kind) return;
    navigator.vibrate?.([55, 30, 90]);
    socketRef.current?.send("power_use", { name: session.name, kind, ...extra });
  };

  const sendReaction = (kind: ReactionKind) => {
    if (!session || isSinging) return;
    const now = Date.now();
    if ((lastReactionRef.current[kind] ?? 0) + 450 > now) return;
    lastReactionRef.current[kind] = now;
    navigator.vibrate?.(20);
    socketRef.current?.send("reaction", { kind, name: session.name });
  };

  const addHype = () => {
    if (isSinging) return;
    pendingHypeRef.current = Math.min(10, pendingHypeRef.current + 1);
    setLocalHype((value) => value + 1);
    navigator.vibrate?.(12);
  };

  if (!hydrated) return <main className="party-bg min-h-screen" />;

  if (!session) {
    return (
      <main className="party-bg party-grid min-h-screen px-5 py-7 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center">
          <form onSubmit={join} className="phone-card w-full border-t-4 border-t-[var(--boca-yellow)] p-6">
            <p className="eyebrow">Sala {roomCode}</p>
            <h1 className="font-display text-5xl font-black uppercase leading-[.86]">Tu teléfono entra al <span className="text-[var(--boca-yellow)]">juego</span></h1>
            <p className="mt-4 text-sm font-medium leading-6 text-white/55">Elegí un símbolo y tu nombre. Después no navegás: el control cambia solo según el momento.</p>
            <div className="mt-6 grid grid-cols-4 gap-2">{AVATARS.map((avatar) => <button key={avatar} type="button" onClick={() => setDraftAvatar(avatar)} className={`grid aspect-square place-items-center border ${draftAvatar === avatar ? "border-[var(--boca-yellow)] bg-[var(--boca-yellow)]/10" : "border-white/10 bg-white/4"}`}><PlayerAvatar avatar={avatar} active={draftAvatar === avatar} /></button>)}</div>
            <label className="field-label mt-6">Nombre<input className="field text-center text-xl font-black uppercase" value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={18} placeholder="TU NOMBRE" /></label>
            <button type="submit" className="primary-button mt-4 w-full justify-center py-4">Entrar a la noche</button>
            <div className={`mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[.16em] ${connected ? "text-[var(--boca-yellow)]" : "text-white/35"}`}>{connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />} {connected ? "Conectado" : "Conectando"}</div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="party-bg party-grid min-h-screen px-4 pb-6 pt-4 text-white no-select">
      <div className="mx-auto max-w-lg">
        <header className="phone-card mb-3 flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3"><PlayerAvatar avatar={session.avatar} size="sm" active={connected} /><div className="min-w-0"><p className="font-display truncate text-xl font-black uppercase leading-none">{session.name}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.15em] text-white/35">{score} puntos · {position ? `puesto ${position}` : "sin ranking"}</p></div></div>
          <div className={connected ? "text-[var(--boca-yellow)]" : "text-white/30"}>{connected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}</div>
        </header>

        {myPower && state.phase !== "SPECIAL_REVEAL" && (
          <div className="mb-3 flex items-center gap-3 border border-[var(--boca-yellow)]/25 bg-[var(--boca-yellow)]/[.07] px-4 py-3">
            <Gift className="h-5 w-5 shrink-0 text-[var(--boca-yellow)]" />
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[var(--boca-yellow)]">Poder guardado</p><p className="font-display truncate text-xl font-black uppercase">{POWER_PHONE_COPY[myPower].label}</p></div>
          </div>
        )}

        {state.phase === "LOBBY" && (
          <section className="phone-card border-t-4 border-t-[var(--boca-yellow)] p-6 text-center"><RadioTower className="mx-auto h-10 w-10 text-[var(--boca-yellow)]" /><p className="eyebrow mt-5">Control listo</p><h2 className="font-display text-5xl font-black uppercase leading-[.86]">Dejalo abierto</h2><p className="mt-4 text-sm font-medium leading-6 text-white/50">Cuando pase algo, este teléfono se convierte automáticamente en el control correcto.</p><div className="mt-6 grid grid-cols-2 gap-2"><div className="border border-white/10 bg-white/4 p-4"><p className="text-[9px] font-black uppercase tracking-[.15em] text-white/35">Puntos</p><p className="font-display mt-1 text-4xl font-black text-[var(--boca-yellow)]">{score}</p></div><div className="border border-white/10 bg-white/4 p-4"><p className="text-[9px] font-black uppercase tracking-[.15em] text-white/35">Posición</p><p className="font-display mt-1 text-4xl font-black">{position || "-"}</p></div></div></section>
        )}

        {state.phase === "DRAW" && (
          <section className="space-y-3">
            <div className={`phone-card border-t-4 p-7 text-center ${isSinging ? "border-t-[var(--boca-yellow)]" : "border-t-white/20"}`}>
              {isSinging ? <Mic2 className="mx-auto h-12 w-12 text-[var(--boca-yellow)]" /> : <UserRound className="mx-auto h-12 w-12 text-white/35" />}
              <p className="eyebrow mt-5">{modeCopy.label}</p>
              <h2 className="font-display text-6xl font-black uppercase leading-[.82]">{isSinging ? "Te tocó" : state.currentSingers.join(" & ")}</h2>
              <p className="mt-4 text-sm font-semibold leading-6 text-white/45">{isSinging ? modeCopy.singer : modeCopy.audience}</p>
              <div className="mt-7 text-[var(--boca-yellow)]"><Countdown endsAt={state.phaseEndsAt} /></div>
            </div>
            {isSinging && myPower === "PASS" && (
              <button type="button" onClick={() => usePower("PASS")} className="flex min-h-36 w-full items-center justify-between border-2 border-[var(--boca-yellow)] bg-[var(--boca-yellow)] px-6 text-left text-[var(--boca-blue)] active:scale-[.985]"><div><p className="text-[10px] font-black uppercase tracking-[.15em] opacity-60">Usar poder ahora</p><p className="font-display mt-2 text-4xl font-black uppercase">Paso libre</p><p className="mt-2 text-xs font-bold opacity-65">Gastás el poder y entra otra persona.</p></div><Ban className="h-10 w-10" /></button>
            )}
          </section>
        )}

        {state.phase === "RESCUE_CALL" && state.rescue && (
          <section className="space-y-3">
            {isSinging ? (
              <div className="phone-card border-t-4 border-t-[var(--boca-yellow)] p-7 text-center"><Mic2 className="mx-auto h-12 w-12 text-[var(--boca-yellow)]" /><p className="eyebrow mt-5">Rescate</p><h2 className="font-display text-5xl font-black uppercase leading-[.86]">Esperá compañero</h2><p className="mt-4 text-sm font-semibold text-white/45">Los demás pueden ofrecerse. Uno de ellos puede subir con vos.</p><div className="mt-6 text-[var(--boca-yellow)]"><Countdown endsAt={state.phaseEndsAt} /></div></div>
            ) : rescueOfferKey === state.rescue.key ? (
              <div className="phone-card grid min-h-[65vh] place-items-center border-t-4 border-t-[var(--boca-yellow)] p-7 text-center"><div><Check className="mx-auto h-14 w-14 text-[var(--boca-yellow)]" /><p className="font-display mt-5 text-5xl font-black uppercase">Te ofreciste</p><p className="mt-3 text-sm font-semibold text-white/45">Si salís elegido, subís al escenario.</p></div></div>
            ) : (
              <button type="button" onClick={sendRescueOffer} className="flex min-h-[70vh] w-full touch-manipulation flex-col items-center justify-center border-2 border-[var(--boca-yellow)] bg-[var(--boca-yellow)] px-7 text-center text-[var(--boca-blue)] active:scale-[.99]"><UserPlus className="h-16 w-16" /><p className="font-display mt-5 text-[clamp(4.8rem,20vw,8rem)] font-black uppercase leading-[.72]">Me sumo</p><p className="mt-6 max-w-xs text-sm font-black uppercase tracking-[.13em] opacity-65">Si tocás, podés terminar cantando con {state.currentSingers[0]}</p><div className="mt-8"><Countdown endsAt={state.phaseEndsAt} /></div></button>
            )}
          </section>
        )}

        {state.phase === "SONG_VOTE" && (
          <section className="space-y-3">
            <div className="phone-card flex items-end justify-between gap-3 border-t-4 border-t-[var(--boca-yellow)] p-5"><div><p className="eyebrow">Votación relámpago</p><h2 className="font-display text-4xl font-black uppercase">Elegí el tema</h2></div><Countdown endsAt={state.phaseEndsAt} /></div>

            {isSinging && myPower === "REROLL" && (
              <button type="button" onClick={() => usePower("REROLL")} className="flex min-h-28 w-full items-center justify-between border-2 border-[var(--boca-yellow)] bg-[var(--boca-yellow)] px-5 text-left text-[var(--boca-blue)] active:scale-[.985]"><div><p className="text-[9px] font-black uppercase tracking-[.15em] opacity-60">Poder disponible</p><p className="font-display mt-1 text-3xl font-black uppercase">Cambiar las dos</p></div><RefreshCw className="h-9 w-9" /></button>
            )}

            {isSinging && myPower === "FREE_PICK" && (
              <div className="border-2 border-[var(--boca-yellow)] bg-[var(--boca-yellow)]/[.07] p-4">
                <button type="button" onClick={() => setFreePickOpen((value) => !value)} className="flex w-full items-center justify-between text-left"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[var(--boca-yellow)]">Poder disponible</p><p className="font-display mt-1 text-3xl font-black uppercase">Carta blanca</p></div><ListMusic className="h-8 w-8 text-[var(--boca-yellow)]" /></button>
                {freePickOpen && <div className="mt-4 max-h-[56vh] space-y-2 overflow-y-auto pr-1">{(state.powerSongChoices ?? []).map((song) => <button key={song.id} type="button" onClick={() => usePower("FREE_PICK", { songId: song.id })} className="w-full border border-white/10 bg-white/5 p-4 text-left active:scale-[.99]"><p className="font-display text-2xl font-black uppercase">{song.title}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.13em] text-white/35">{song.artist}</p></button>)}</div>}
              </div>
            )}

            {isSinging && myPower === "DECIDE" ? (
              <div className="space-y-3">
                <div className="phone-card p-4 text-center"><Gift className="mx-auto h-7 w-7 text-[var(--boca-yellow)]" /><p className="font-display mt-2 text-3xl font-black uppercase">Última palabra</p><p className="mt-2 text-xs font-semibold text-white/42">Elegí una y la votación termina en el acto.</p></div>
                {state.songOptions.map((song, index) => <button type="button" key={song.id} onClick={() => usePower("DECIDE", { option: index })} className="flex min-h-32 w-full items-center justify-between border-2 border-[var(--boca-yellow)] bg-[var(--boca-yellow)] px-5 text-left text-[var(--boca-blue)] active:scale-[.985]"><div><p className="text-[9px] font-black uppercase tracking-[.13em] opacity-60">Elegir con poder</p><p className="font-display mt-1 text-3xl font-black uppercase leading-[.9]">{song.title}</p><p className="mt-2 text-xs font-bold uppercase opacity-60">{song.artist}</p></div><Check className="h-8 w-8" /></button>)}
              </div>
            ) : votedSongKey === state.songVoteKey ? (
              <div className="phone-card grid min-h-60 place-items-center p-7 text-center"><div><Check className="mx-auto h-12 w-12 text-[var(--boca-yellow)]" /><p className="font-display mt-4 text-4xl font-black uppercase">Voto enviado</p><p className="mt-2 text-sm text-white/42">En unos segundos arranca.</p></div></div>
            ) : state.songOptions.map((song, index) => (
              <button type="button" key={song.id} onClick={() => sendSongVote(index as 0 | 1)} className="phone-card w-full border-l-4 border-l-[var(--boca-yellow)] p-6 text-left active:scale-[.985]"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--boca-yellow)]">Opción {index + 1}</p><p className="font-display mt-2 text-4xl font-black uppercase leading-[.9]">{song.title}</p><p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-white/40">{song.artist}</p></button>
            ))}
          </section>
        )}

        {state.phase === "SINGING" && (
          <section className="space-y-3">
            <div className="phone-card border-t-4 border-t-[var(--boca-yellow)] p-5"><p className="eyebrow">{modeCopy.label}</p><h2 className="font-display text-4xl font-black uppercase leading-none">{state.currentSingers.join(" & ")}</h2><div className="mt-4 h-2 bg-white/10"><div className="h-full bg-[var(--boca-yellow)]" style={{ width: `${Math.min(100, (state.hype / Math.max(1, state.hypeTarget)) * 100)}%` }} /></div></div>
            {isSinging ? (
              <div className="phone-card grid min-h-[55vh] place-items-center p-8 text-center"><div><Mic2 className="mx-auto h-14 w-14 text-[var(--boca-yellow)]" /><p className="font-display mt-5 text-6xl font-black uppercase leading-[.8]">Cantá</p><p className="mt-4 text-sm font-semibold leading-6 text-white/45">Tu teléfono descansa. El resto de la sala está levantando el Hype.</p></div></div>
            ) : (
              <>
                <button type="button" onClick={addHype} className="flex min-h-[38vh] w-full touch-manipulation flex-col items-center justify-center border-2 border-[var(--boca-yellow)] bg-[var(--boca-yellow)] text-[var(--boca-blue)] shadow-[0_20px_70px_rgba(255,209,0,.16)] active:scale-[.985]"><Bolt className="h-14 w-14" /><span className="font-display mt-3 text-7xl font-black uppercase leading-none">Subí el Hype</span><span className="mt-3 text-xs font-black uppercase tracking-[.16em] opacity-60">tocá cuando el show lo merezca · {localHype}</span></button>
                <div className="grid grid-cols-4 gap-2">{reactionButtons.map(({ kind, label, icon: Icon }) => <button key={kind} type="button" onClick={() => sendReaction(kind)} className="phone-card flex aspect-square flex-col items-center justify-center gap-2 active:scale-95"><Icon className="h-7 w-7 text-[var(--boca-yellow)]" /><span className="text-[8px] font-black uppercase tracking-[.08em] text-white/45">{label}</span></button>)}</div>
              </>
            )}
          </section>
        )}

        {state.phase === "DUEL_VOTE" && state.duelVote && (
          <section className="space-y-3">
            <div className="phone-card flex items-end justify-between gap-3 border-t-4 border-t-[var(--boca-yellow)] p-5"><div><p className="eyebrow">Duelo</p><h2 className="font-display text-4xl font-black uppercase leading-[.9]">¿Quién se quedó con el show?</h2></div><Countdown endsAt={state.phaseEndsAt} /></div>
            {isSinging ? (
              <div className="phone-card grid min-h-60 place-items-center p-7 text-center"><div><Swords className="mx-auto h-12 w-12 text-[var(--boca-yellow)]" /><p className="font-display mt-4 text-4xl font-black uppercase">No votás tu duelo</p><p className="mt-2 text-sm text-white/42">Que decida el resto.</p></div></div>
            ) : duelVoteKey === state.duelVote.key ? (
              <div className="phone-card grid min-h-60 place-items-center p-7 text-center"><div><Check className="mx-auto h-12 w-12 text-[var(--boca-yellow)]" /><p className="font-display mt-4 text-4xl font-black uppercase">Voto enviado</p></div></div>
            ) : (
              <div className="grid gap-3"><button type="button" onClick={() => sendDuelVote(0)} className="min-h-40 border-2 border-[var(--boca-yellow)] bg-[var(--boca-yellow)] p-6 text-left text-[var(--boca-blue)] active:scale-[.985]"><Swords className="h-7 w-7" /><p className="font-display mt-4 text-5xl font-black uppercase leading-[.85]">{state.duelVote.left}</p></button><button type="button" onClick={() => sendDuelVote(1)} className="phone-card min-h-40 border-2 border-white/20 p-6 text-left active:scale-[.985]"><Swords className="h-7 w-7 text-[var(--boca-yellow)]" /><p className="font-display mt-4 text-5xl font-black uppercase leading-[.85]">{state.duelVote.right}</p></button></div>
            )}
          </section>
        )}

        {state.phase === "SECRET_VOTE" && state.secretVote && (
          <section className="space-y-3">
            <div className="phone-card flex items-end justify-between gap-3 border-t-4 border-t-[var(--boca-yellow)] p-5"><div><p className="eyebrow">Momento sorpresa</p><h2 className="font-display text-4xl font-black uppercase leading-[.9]">Elegí a alguien</h2><p className="mt-2 text-xs font-semibold text-white/40">No sabés para qué. Ese es el punto.</p></div><Countdown endsAt={state.phaseEndsAt} /></div>
            {secretVoteKey === state.secretVote.key ? (
              <div className="phone-card grid min-h-72 place-items-center p-7 text-center"><div><Check className="mx-auto h-12 w-12 text-[var(--boca-yellow)]" /><p className="font-display mt-4 text-5xl font-black uppercase">Voto guardado</p><p className="mt-3 text-sm font-semibold text-white/42">Ahora mirá la pantalla.</p></div></div>
            ) : (
              <div className="grid grid-cols-2 gap-3">{state.secretVote.candidates.filter((name) => name !== session.name).map((name) => <button type="button" key={name} onClick={() => sendSecretVote(name)} className="phone-card min-h-28 border-l-4 border-l-[var(--boca-yellow)] p-4 text-left active:scale-[.985]"><Vote className="h-5 w-5 text-[var(--boca-yellow)]" /><p className="font-display mt-3 text-3xl font-black uppercase leading-[.88]">{name}</p></button>)}</div>
            )}
          </section>
        )}

        {state.phase === "POWER_DRAW" && state.powerDraw && (
          <section className="space-y-3">
            <div className="phone-card flex items-end justify-between gap-3 border-t-4 border-t-[var(--boca-yellow)] p-5"><div><p className="eyebrow">Sobre dorado</p><h2 className="font-display text-4xl font-black uppercase leading-[.9]">¿Te la jugás?</h2><p className="mt-2 text-xs font-semibold text-white/40">Entre los que entren, uno se lleva un poder.</p></div><Countdown endsAt={state.phaseEndsAt} /></div>
            {powerDrawKey === state.powerDraw.key ? (
              <div className="phone-card grid min-h-72 place-items-center p-7 text-center"><div><Check className="mx-auto h-12 w-12 text-[var(--boca-yellow)]" /><p className="font-display mt-4 text-5xl font-black uppercase">Estás adentro</p><p className="mt-3 text-sm font-semibold text-white/42">Ahora que salga lo que tenga que salir.</p></div></div>
            ) : (
              <button type="button" onClick={joinPowerDraw} className="min-h-72 w-full border-2 border-[var(--boca-yellow)] bg-[var(--boca-yellow)] p-8 text-[var(--boca-blue)] active:scale-[.985]"><Gift className="mx-auto h-12 w-12" /><p className="font-display mt-5 text-6xl font-black uppercase leading-[.82]">Abrir el sobre</p></button>
            )}
          </section>
        )}

        {state.phase === "FATE_VOTE" && state.fateVote && (
          <section className="space-y-3">
            <div className="phone-card flex items-end justify-between gap-3 border-t-4 border-t-[var(--boca-yellow)] p-5"><div><p className="eyebrow">Dos puertas</p><h2 className="font-display text-4xl font-black uppercase leading-[.9]">Elegí sin saber</h2><p className="mt-2 text-xs font-semibold text-white/40">Atrás hay dos formas distintas de seguir la noche.</p></div><Countdown endsAt={state.phaseEndsAt} /></div>
            {fateVoteKey === state.fateVote.key ? (
              <div className="phone-card grid min-h-72 place-items-center p-7 text-center"><div><Check className="mx-auto h-12 w-12 text-[var(--boca-yellow)]" /><p className="font-display mt-4 text-5xl font-black uppercase">Elegiste</p><p className="mt-3 text-sm font-semibold text-white/42">El resultado aparece en la pantalla.</p></div></div>
            ) : (
              <div className="grid gap-3"><button type="button" onClick={() => sendFateVote(0)} className="min-h-44 border-2 border-[#1c5cff] bg-[#0a2f91] p-6 text-left active:scale-[.985]"><p className="font-display text-6xl font-black uppercase">Azul</p></button><button type="button" onClick={() => sendFateVote(1)} className="min-h-44 border-2 border-[var(--boca-yellow)] bg-[var(--boca-yellow)] p-6 text-left text-[var(--boca-blue)] active:scale-[.985]"><p className="font-display text-6xl font-black uppercase">Oro</p></button></div>
            )}
          </section>
        )}

        {state.phase === "SPECIAL_REVEAL" && state.specialReveal && (
          <section className={`phone-card border-t-4 p-7 text-center ${state.specialReveal.player === session.name ? "border-t-[var(--boca-yellow)]" : "border-t-white/20"}`}>
            <Gift className={`mx-auto h-12 w-12 ${state.specialReveal.player === session.name ? "text-[var(--boca-yellow)]" : "text-white/40"}`} />
            <p className="eyebrow mt-5">Se revela</p>
            <h2 className="font-display text-5xl font-black uppercase leading-[.86]">{state.specialReveal.title}</h2>
            <p className="font-display mt-5 text-3xl font-black uppercase text-[var(--boca-yellow)]">{state.specialReveal.detail}</p>
            {state.specialReveal.power && <p className="mt-4 text-sm font-semibold leading-6 text-white/50">{POWER_PHONE_COPY[state.specialReveal.power].detail}</p>}
            <div className="mt-6 text-[var(--boca-yellow)]"><Countdown endsAt={state.phaseEndsAt} /></div>
          </section>
        )}

        {state.phase === "RESULTS" && (
          <section className="phone-card border-t-4 border-t-[var(--boca-yellow)] p-6 text-center"><Trophy className="mx-auto h-10 w-10 text-[var(--boca-yellow)]" /><p className="eyebrow mt-5">Party pass</p><h2 className="font-display text-5xl font-black uppercase">{score} puntos</h2><p className="font-display mt-2 text-3xl font-black uppercase text-white/45">Puesto {position || "-"}</p><p className="mt-5 text-sm font-medium leading-6 text-white/45">El próximo control aparece solo. No hace falta navegar ni volver a entrar.</p></section>
        )}
      </div>
    </main>
  );
}
