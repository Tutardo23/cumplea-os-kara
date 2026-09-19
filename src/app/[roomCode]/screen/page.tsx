"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import {
  Activity,
  BarChart3,
  Bomb,
  Flame,
  Gamepad2,
  Gift,
  Hand,
  Heart,
  ListMusic,
  Mic2,
  Settings2,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  UserPlus,
  Users,
  Vote,
} from "lucide-react";
import { Countdown } from "@/components/party/Countdown";
import { PlayerAvatar } from "@/components/party/PlayerAvatar";
import { SpotlightDraw } from "@/components/party/SpotlightDraw";
import { KaraokePlayer } from "@/components/karaoke/KaraokePlayer";
import { SongManager } from "@/components/karaoke/SongManager";
import { pickFairSingers, pickSongOptions } from "@/lib/game";
import { loadSongs } from "@/lib/song-store";
import { PartySocket } from "@/lib/party-backend";
import type {
  AvatarKey,
  KaraokeMode,
  Performance,
  Phase,
  PowerKind,
  Player,
  PublicRoomState,
  SpecialEventKind,
  ReactionKind,
  Song,
} from "@/types/game";

const EMPTY_REACTIONS: Record<ReactionKind, number> = { fire: 0, heart: 0, clap: 0, skull: 0 };

const TEST_PLAYERS: Player[] = [
  { name: "Nico Test", avatar: "gamepad" },
  { name: "Machi Test", avatar: "crown" },
  { name: "Fede Test", avatar: "guitar" },
  { name: "Tomi Test", avatar: "headphones" },
  { name: "Santi Test", avatar: "bolt" },
  { name: "Fran Test", avatar: "disc" },
];

const TEST_PLAYER_NAMES = new Set(TEST_PLAYERS.map((player) => player.name));
const TEST_SONG: Song = { id: "__test-video__", title: "Video de prueba", artist: "Solo para probar el flujo", source: { type: "youtube", videoId: "M7lc1UVf-VE" } };


const POWER_COPY: Record<PowerKind, { label: string; detail: string }> = {
  PASS: { label: "Paso libre", detail: "Si te toca cantar, gastalo y el sistema busca otra persona." },
  DECIDE: { label: "Última palabra", detail: "Si estás por cantar, elegís una de las dos opciones y anulás la votación." },
  REROLL: { label: "Cambio total", detail: "Si estás por cantar, cambiás las dos canciones que salieron." },
  FREE_PICK: { label: "Carta blanca", detail: "Si estás por cantar, elegís directamente cualquier tema de la biblioteca." },
};

const POWER_KINDS = Object.keys(POWER_COPY) as PowerKind[];

const MODE_COPY: Record<KaraokeMode, { label: string; kicker: string; detail: string }> = {
  EXPRESS: { label: "Karaoke Express", kicker: "Uno al escenario", detail: "Sale una persona y todos eligen el tema en segundos." },
  DUO: { label: "Dúo Sorpresa", kicker: "Dos al escenario", detail: "La dupla aparece de golpe y el público decide qué cantan." },
  BOMB: { label: "Tema Bomba", kicker: "Sin elección", detail: "Sale una persona y el tema entra directo. No hay tiempo para negociar." },
  RESCUE: { label: "Rescate", kicker: "Alguien puede sumarse", detail: "Sale una persona y el resto tiene cinco segundos para ofrecerse como compañero." },
  DUEL: { label: "Duelo", kicker: "Dos contra dos segundos", detail: "Dos cantan el mismo tema y al final el público elige quién se quedó con el show." },
};

type HostSnapshot = {
  players: Player[];
  partyScores: Record<string, number>;
  performances: Performance[];
  singerStats: Record<string, { count: number; lastTurn: number }>;
  turnNumber: number;
  history: KaraokeMode[];
  powers: Record<string, PowerKind | undefined>;
  lastSpecialPerformanceCount: number;
  usedSpecialEvents: SpecialEventKind[];
};

export default function PartyScreen() {
  const params = useParams();
  const roomCode = String(params.roomCode ?? "MACHI");
  const socketRef = useRef<PartySocket | null>(null);
  const hydratedRef = useRef(false);
  const latestStateRef = useRef<PublicRoomState | null>(null);
  const liveBroadcastTimerRef = useRef<number | null>(null);
  const songVotersRef = useRef(new Set<string>());
  const rescueOffersRef = useRef(new Set<string>());
  const duelVotersRef = useRef(new Set<string>());
  const secretVotersRef = useRef(new Set<string>());
  const powerDrawJoinersRef = useRef(new Set<string>());
  const fateVotersRef = useRef(new Set<string>());
  const songVoteKeyRef = useRef("");
  const rescueKeyRef = useRef("");
  const duelKeyRef = useRef("");
  const secretVoteKeyRef = useRef("");
  const powerDrawKeyRef = useRef("");
  const fateVoteKeyRef = useRef("");
  const fateOutcomesRef = useRef<{ left: KaraokeMode; right: KaraokeMode }>({ left: "DUO", right: "BOMB" });
  const powerActionRef = useRef<(payload: Record<string, unknown>) => void>(() => {});
  const finishingRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("LOBBY");
  const [mode, setMode] = useState<KaraokeMode>("EXPRESS");
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | undefined>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [availableSongIds, setAvailableSongIds] = useState<string[]>([]);
  const [currentSingers, setCurrentSingers] = useState<string[]>([]);
  const [songOptions, setSongOptions] = useState<Song[]>([]);
  const [activeSong, setActiveSong] = useState<Song | undefined>();
  const [songVotes, setSongVotes] = useState({ left: 0, right: 0 });
  const [songVoteKey, setSongVoteKey] = useState("");
  const [rescueKey, setRescueKey] = useState("");
  const [rescueOffers, setRescueOffers] = useState<string[]>([]);
  const [duelKey, setDuelKey] = useState("");
  const [duelVotes, setDuelVotes] = useState({ left: 0, right: 0 });
  const [pendingShowScore, setPendingShowScore] = useState(0);
  const [partyScores, setPartyScores] = useState<Record<string, number>>({});
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [hype, setHype] = useState(0);
  const [reactions, setReactions] = useState<Record<ReactionKind, number>>(EMPTY_REACTIONS);
  const [sequence, setSequence] = useState(0);
  const [showSongManager, setShowSongManager] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [resultTitle, setResultTitle] = useState("La noche recién empieza");
  const [resultDetail, setResultDetail] = useState("El sistema va mezclando formatos para que no se repita siempre lo mismo.");
  const [singerStats, setSingerStats] = useState<Record<string, { count: number; lastTurn: number }>>({});
  const [turnNumber, setTurnNumber] = useState(0);
  const [history, setHistory] = useState<KaraokeMode[]>([]);
  const [powers, setPowers] = useState<Record<string, PowerKind | undefined>>({});
  const [powerSongChoices, setPowerSongChoices] = useState<Song[]>([]);
  const [powerEvent, setPowerEvent] = useState<PublicRoomState["powerEvent"]>();
  const [secretVoteKey, setSecretVoteKey] = useState("");
  const [secretVotes, setSecretVotes] = useState<Record<string, number>>({});
  const [powerDrawKey, setPowerDrawKey] = useState("");
  const [powerDrawJoiners, setPowerDrawJoiners] = useState<string[]>([]);
  const [fateVoteKey, setFateVoteKey] = useState("");
  const [fateVotes, setFateVotes] = useState({ left: 0, right: 0 });
  const [specialReveal, setSpecialReveal] = useState<PublicRoomState["specialReveal"]>();
  const [usedSpecialEvents, setUsedSpecialEvents] = useState<SpecialEventKind[]>([]);
  const [lastSpecialPerformanceCount, setLastSpecialPerformanceCount] = useState(0);
  const [testMode, setTestMode] = useState(false);

  const hypeTarget = Math.max(28, onlinePlayers.length * 9);
  const sortedScores = useMemo(
    () => Object.entries(partyScores).sort((a, b) => b[1] - a[1]),
    [partyScores]
  );

  const publicState = useMemo<PublicRoomState>(() => ({
    phase,
    sequence,
    mode,
    players,
    currentSingers,
    songOptions,
    activeSong,
    phaseEndsAt,
    songVoteKey,
    hype,
    hypeTarget,
    reactions,
    partyScores,
    performances,
    powers,
    powerSongChoices,
    powerEvent,
    secretVote: phase === "SECRET_VOTE" ? { key: secretVoteKey, candidates: players.map((player) => player.name), votesCast: Object.values(secretVotes).reduce((sum, value) => sum + value, 0) } : undefined,
    powerDraw: phase === "POWER_DRAW" ? { key: powerDrawKey, joined: powerDrawJoiners.length } : undefined,
    fateVote: phase === "FATE_VOTE" ? { key: fateVoteKey, leftVotes: fateVotes.left, rightVotes: fateVotes.right } : undefined,
    specialReveal: phase === "SPECIAL_REVEAL" ? specialReveal : undefined,
    rescue: phase === "RESCUE_CALL" ? { key: rescueKey, offers: rescueOffers } : undefined,
    duelVote: phase === "DUEL_VOTE" && currentSingers.length >= 2
      ? { key: duelKey, left: currentSingers[0], right: currentSingers[1], leftVotes: duelVotes.left, rightVotes: duelVotes.right }
      : undefined,
  }), [phase, sequence, mode, players, currentSingers, songOptions, activeSong, phaseEndsAt, songVoteKey, hype, hypeTarget, reactions, partyScores, performances, powers, powerSongChoices, powerEvent, secretVoteKey, secretVotes, powerDrawKey, powerDrawJoiners, fateVoteKey, fateVotes, specialReveal, rescueKey, rescueOffers, duelKey, duelVotes]);

  useEffect(() => {
    latestStateRef.current = publicState;
    songVoteKeyRef.current = songVoteKey;
    rescueKeyRef.current = rescueKey;
    duelKeyRef.current = duelKey;
    secretVoteKeyRef.current = secretVoteKey;
    powerDrawKeyRef.current = powerDrawKey;
    fateVoteKeyRef.current = fateVoteKey;
  }, [publicState, songVoteKey, rescueKey, duelKey, secretVoteKey, powerDrawKey, fateVoteKey]);

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/${roomCode}/play`);
  }, [roomCode]);

  useEffect(() => {
    void loadSongs().then((loaded) => {
      setSongs(loaded);
      setAvailableSongIds(loaded.map((song) => song.id));
    });
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`machis-night-v24-host-${roomCode}`);
      if (raw) {
        const saved = JSON.parse(raw) as HostSnapshot;
        setPlayers(Array.isArray(saved.players) ? saved.players : []);
        setPartyScores(saved.partyScores ?? {});
        setPerformances(Array.isArray(saved.performances) ? saved.performances : []);
        setSingerStats(saved.singerStats ?? {});
        setTurnNumber(saved.turnNumber ?? 0);
        setHistory(Array.isArray(saved.history) ? saved.history : []);
        setPowers(saved.powers ?? {});
        setLastSpecialPerformanceCount(saved.lastSpecialPerformanceCount ?? 0);
        setUsedSpecialEvents(Array.isArray(saved.usedSpecialEvents) ? saved.usedSpecialEvents : []);
      }
    } catch {
      // Start clean if local state is unavailable.
    } finally {
      hydratedRef.current = true;
    }
  }, [roomCode]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const realPlayers = players.filter((player) => !TEST_PLAYER_NAMES.has(player.name));
    const realScores = Object.fromEntries(Object.entries(partyScores).filter(([name]) => !TEST_PLAYER_NAMES.has(name)));
    const realPowers = Object.fromEntries(Object.entries(powers).filter(([name]) => !TEST_PLAYER_NAMES.has(name)));
    const snapshot: HostSnapshot = { players: realPlayers, partyScores: realScores, performances, singerStats, turnNumber, history, powers: realPowers, lastSpecialPerformanceCount, usedSpecialEvents };
    try {
      window.localStorage.setItem(`machis-night-v24-host-${roomCode}`, JSON.stringify(snapshot));
    } catch {
      // Party state can continue without local persistence.
    }
  }, [roomCode, players, partyScores, performances, singerStats, turnNumber, history, powers, lastSpecialPerformanceCount, usedSpecialEvents]);

  const broadcastFullState = useCallback(() => {
    if (!socketRef.current || !latestStateRef.current) return;
    socketRef.current.send("host_state", {
      mode: "full",
      state: latestStateRef.current as unknown as Record<string, unknown>,
    });
  }, []);

  const broadcastLiveState = useCallback(() => {
    if (!socketRef.current || !latestStateRef.current || liveBroadcastTimerRef.current) return;
    liveBroadcastTimerRef.current = window.setTimeout(() => {
      liveBroadcastTimerRef.current = null;
      const state = latestStateRef.current;
      if (!state || !socketRef.current) return;
      socketRef.current.send("host_state", {
        mode: "live",
        state: {
          hype: state.hype,
          hypeTarget: state.hypeTarget,
          reactions: state.reactions,
          partyScores: state.partyScores,
          rescue: state.rescue,
          duelVote: state.duelVote,
          secretVote: state.secretVote,
          powerDraw: state.powerDraw,
          fateVote: state.fateVote,
        },
      });
    }, 160);
  }, []);

  useEffect(() => {
    const socket = new PartySocket({
      roomCode,
      role: "host",
      onEvent: ({ type, payload = {} }) => {
        if (type === "presence_state") {
          const discovered = Array.isArray(payload.players)
            ? (payload.players as Array<{ name?: string; avatar?: AvatarKey }>).filter((entry) => typeof entry.name === "string")
            : [];
          const online = discovered.map((entry) => String(entry.name));
          setOnlinePlayers([...new Set(online)]);
          setPlayers((prev) => {
            const next = [...prev];
            for (const entry of discovered) {
              const name = String(entry.name);
              if (!next.some((item) => item.name.toLowerCase() === name.toLowerCase())) next.push({ name, avatar: entry.avatar || "star" });
            }
            return next;
          });
          setPartyScores((prev) => {
            const next = { ...prev };
            for (const entry of discovered) {
              const name = String(entry.name);
              if (next[name] === undefined) next[name] = 0;
            }
            return next;
          });
          return;
        }

        if (type === "new_player") {
          const name = String(payload.name ?? "").trim();
          if (!name) return;
          const avatar = (payload.avatar as AvatarKey) || "star";
          setPlayers((prev) => prev.some((player) => player.name.toLowerCase() === name.toLowerCase()) ? prev : [...prev, { name, avatar }]);
          setPartyScores((prev) => ({ ...prev, [name]: prev[name] ?? 0 }));
          window.setTimeout(broadcastFullState, 80);
          return;
        }

        if (type === "song_vote") {
          if (payload.key !== songVoteKeyRef.current) return;
          const name = String(payload.name ?? "");
          if (!name || songVotersRef.current.has(name)) return;
          songVotersRef.current.add(name);
          setSongVotes((prev) => payload.option === 0 ? { ...prev, left: prev.left + 1 } : { ...prev, right: prev.right + 1 });
          return;
        }

        if (type === "hype_batch") {
          const delta = Math.max(0, Math.min(10, Number(payload.delta) || 0));
          if (delta) setHype((prev) => prev + delta);
          return;
        }

        if (type === "reaction") {
          const kind = payload.kind as ReactionKind;
          if (!(Object.keys(EMPTY_REACTIONS) as ReactionKind[]).includes(kind)) return;
          setReactions((prev) => ({ ...prev, [kind]: prev[kind] + 1 }));
          return;
        }

        if (type === "rescue_offer") {
          if (payload.key !== rescueKeyRef.current) return;
          const name = String(payload.name ?? "").trim();
          if (!name || rescueOffersRef.current.has(name)) return;
          rescueOffersRef.current.add(name);
          setRescueOffers((prev) => [...prev, name]);
          return;
        }

        if (type === "duel_vote") {
          if (payload.key !== duelKeyRef.current) return;
          const name = String(payload.name ?? "").trim();
          if (!name || duelVotersRef.current.has(name)) return;
          if (latestStateRef.current?.currentSingers.includes(name)) return;
          duelVotersRef.current.add(name);
          setDuelVotes((prev) => payload.option === 0 ? { ...prev, left: prev.left + 1 } : { ...prev, right: prev.right + 1 });
          return;
        }

        if (type === "secret_vote") {
          if (payload.key !== secretVoteKeyRef.current) return;
          const voter = String(payload.name ?? "").trim();
          const target = String(payload.target ?? "").trim();
          if (!voter || !target || voter === target || secretVotersRef.current.has(voter)) return;
          if (!latestStateRef.current?.players.some((player) => player.name === target)) return;
          secretVotersRef.current.add(voter);
          setSecretVotes((prev) => ({ ...prev, [target]: (prev[target] ?? 0) + 1 }));
          return;
        }

        if (type === "power_draw_join") {
          if (payload.key !== powerDrawKeyRef.current) return;
          const name = String(payload.name ?? "").trim();
          if (!name || powerDrawJoinersRef.current.has(name)) return;
          if (!latestStateRef.current?.players.some((player) => player.name === name)) return;
          powerDrawJoinersRef.current.add(name);
          setPowerDrawJoiners((prev) => [...prev, name]);
          return;
        }

        if (type === "fate_vote") {
          if (payload.key !== fateVoteKeyRef.current) return;
          const name = String(payload.name ?? "").trim();
          if (!name || fateVotersRef.current.has(name)) return;
          fateVotersRef.current.add(name);
          setFateVotes((prev) => payload.option === 0 ? { ...prev, left: prev.left + 1 } : { ...prev, right: prev.right + 1 });
          return;
        }

        if (type === "power_use") {
          powerActionRef.current(payload);
        }
      },
      onStatus: (connected) => {
        if (connected) window.setTimeout(broadcastFullState, 120);
      },
    });

    socketRef.current = socket;
    socket.connect();
    return () => {
      if (liveBroadcastTimerRef.current) window.clearTimeout(liveBroadcastTimerRef.current);
      socket.close();
      socketRef.current = null;
    };
  }, [roomCode, broadcastFullState]);

  useEffect(() => {
    if (["SINGING", "RESCUE_CALL", "DUEL_VOTE", "SECRET_VOTE", "POWER_DRAW", "FATE_VOTE"].includes(phase)) broadcastLiveState();
  }, [phase, hype, reactions, rescueOffers, duelVotes, secretVotes, powerDrawJoiners, fateVotes, partyScores, broadcastLiveState]);

  useEffect(() => {
    broadcastFullState();
  }, [phase, sequence, mode, players, currentSingers, songOptions, activeSong, phaseEndsAt, songVoteKey, rescueKey, duelKey, secretVoteKey, powerDrawKey, fateVoteKey, powers, powerSongChoices, powerEvent, specialReveal, broadcastFullState]);

  const setTimedPhase = useCallback((nextPhase: Phase, durationMs: number) => {
    setPhase(nextPhase);
    setPhaseEndsAt(Date.now() + durationMs);
    setSequence((value) => value + 1);
  }, []);

  const chooseMode = useCallback((): KaraokeMode => {
    const last = history.at(-1);
    const candidates: Array<{ mode: KaraokeMode; weight: number }> = [
      { mode: "EXPRESS", weight: 36 },
      { mode: "DUO", weight: players.length >= 3 ? 20 : 0 },
      { mode: "BOMB", weight: 20 },
      { mode: "RESCUE", weight: players.length >= 3 ? 14 : 0 },
      { mode: "DUEL", weight: players.length >= 4 ? 10 : 0 },
    ];
    const pool = candidates.filter((item) => item.weight > 0 && item.mode !== last);
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    return pool.find((item) => {
      roll -= item.weight;
      return roll <= 0;
    })?.mode ?? "EXPRESS";
  }, [history, players.length]);

  const markSongPlayed = useCallback((songId: string) => {
    if (songId === TEST_SONG.id) return;
    setAvailableSongIds((prev) => {
      const current = prev.length ? prev : songs.map((song) => song.id);
      const next = current.filter((id) => id !== songId);
      if (next.length) return next;
      const reset = songs.map((song) => song.id).filter((id) => id !== songId);
      return reset.length ? reset : songs.map((song) => song.id);
    });
  }, [songs]);

  const getCatalog = useCallback(() => {
    const validSongs = songs.filter((song) => song.title.trim() && /^[\w-]{11}$/.test(song.source.videoId.trim()));
    return validSongs.length ? validSongs : testMode ? [TEST_SONG] : [];
  }, [songs, testMode]);

  const showPowerEvent = useCallback((player: string, kind: PowerKind, text: string) => {
    const id = `power-event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setPowerEvent({ id, player, kind, text });
    window.setTimeout(() => setPowerEvent((current) => current?.id === id ? undefined : current), testMode ? 1500 : 3200);
  }, [testMode]);

  const startMode = useCallback((forcedMode?: KaraokeMode, forcedSinger?: string) => {
    if (players.length < 2) return;
    const catalog = getCatalog();
    if (!catalog.length) {
      setShowSongManager(true);
      return;
    }

    finishingRef.current = false;
    const nextMode = forcedMode ?? chooseMode();
    const nextTurn = turnNumber + 1;
    const singerCount = nextMode === "DUO" || nextMode === "DUEL" ? 2 : 1;
    let singers = pickFairSingers(players, singerStats, nextTurn, singerCount);

    if (forcedSinger && players.some((player) => player.name === forcedSinger)) {
      const others = pickFairSingers(players.filter((player) => player.name !== forcedSinger), singerStats, nextTurn, Math.max(0, singerCount - 1));
      singers = [forcedSinger, ...others].slice(0, singerCount);
    }

    const currentPool = catalog.filter((song) => availableSongIds.includes(song.id));
    const options = pickSongOptions(currentPool.length ? currentPool : catalog, catalog);
    const directSong = nextMode === "BOMB" || options.length === 1 ? options[0] : undefined;
    const extraChoices = [...catalog].sort((a, b) => `${a.artist} ${a.title}`.localeCompare(`${b.artist} ${b.title}`, "es"));

    setMode(nextMode);
    setTurnNumber(nextTurn);
    setCurrentSingers(singers);
    setSingerStats((prev) => {
      const next = { ...prev };
      singers.forEach((name) => {
        const stat = next[name] ?? { count: 0, lastTurn: -999 };
        next[name] = { count: stat.count + 1, lastTurn: nextTurn };
      });
      return next;
    });
    setSongOptions(options);
    setPowerSongChoices(extraChoices);
    setActiveSong(directSong);
    setSongVotes({ left: 0, right: 0 });
    setHype(0);
    setReactions(EMPTY_REACTIONS);
    setRescueOffers([]);
    setDuelVotes({ left: 0, right: 0 });
    setPendingShowScore(0);
    setSpecialReveal(undefined);
    songVotersRef.current.clear();
    rescueOffersRef.current.clear();
    duelVotersRef.current.clear();
    setSongVoteKey(`song-${roomCode}-${Date.now()}`);
    setRescueKey(`rescue-${roomCode}-${Date.now()}`);
    setDuelKey(`duel-${roomCode}-${Date.now()}`);
    setHistory((prev) => [...prev.slice(-7), nextMode]);
    setTimedPhase("DRAW", testMode ? 1300 : 3400);
  }, [players, getCatalog, chooseMode, turnNumber, singerStats, availableSongIds, roomCode, setTimedPhase, testMode]);

  const startSinging = useCallback((song?: Song) => {
    const selected = song ?? activeSong ?? songOptions[0];
    if (!selected) return;
    setActiveSong(selected);
    markSongPlayed(selected.id);
    setPhase("SINGING");
    setPhaseEndsAt(undefined);
    setSequence((value) => value + 1);
  }, [activeSong, songOptions, markSongPlayed]);

  const resolveSongVote = useCallback(() => {
    if (!songOptions.length) return;
    if (songOptions.length === 1) {
      startSinging(songOptions[0]);
      return;
    }
    const winnerIndex = songVotes.left === songVotes.right
      ? Math.floor(Math.random() * 2)
      : songVotes.left > songVotes.right ? 0 : 1;
    startSinging(songOptions[winnerIndex]);
  }, [songOptions, songVotes, startSinging]);

  const resolveRescue = useCallback(() => {
    const eligible = rescueOffers.filter((name) => !currentSingers.includes(name));
    if (eligible.length) {
      const selected = eligible[Math.floor(Math.random() * eligible.length)];
      setCurrentSingers((prev) => [...new Set([...prev, selected])]);
      setPartyScores((prev) => ({ ...prev, [selected]: (prev[selected] ?? 0) + 50 }));
    }
    if (songOptions.length >= 2) setTimedPhase("SONG_VOTE", testMode ? 2200 : 6000);
    else startSinging(songOptions[0]);
  }, [rescueOffers, currentSingers, songOptions, setTimedPhase, testMode, startSinging]);

  const finalizePerformance = useCallback((showScore: number, duelWinner?: string) => {
    if (!activeSong || !currentSingers.length) return;
    const basePoints = 100 + showScore * 3;
    const performance: Performance = {
      id: `perf-${Date.now()}`,
      singers: currentSingers,
      songId: activeSong.id,
      songTitle: activeSong.title,
      score: showScore,
      mode,
      winner: duelWinner,
    };
    setPerformances((prev) => [...prev, performance]);
    setPartyScores((prev) => {
      const next = { ...prev };
      currentSingers.forEach((name) => { next[name] = (next[name] ?? 0) + basePoints; });
      if (mode === "DUEL") {
        if (duelWinner) next[duelWinner] = (next[duelWinner] ?? 0) + 250;
        else currentSingers.forEach((name) => { next[name] = (next[name] ?? 0) + 125; });
      }
      return next;
    });

    if (mode === "DUEL") {
      setResultTitle(duelWinner ? `${duelWinner} se quedó con el duelo` : "Empate total");
      setResultDetail(`${activeSong.title}. El show llegó a ${showScore}/100 y el público decidió en segundos.`);
    } else {
      setResultTitle(showScore >= 82 ? "La rompieron" : showScore >= 60 ? "Show aprobado" : "Sobrevivieron al escenario");
      setResultDetail(`${currentSingers.join(" & ")} · ${activeSong.title} · Hype final ${showScore}/100.`);
    }
    if (showScore >= 78) confetti({ particleCount: 130, spread: 90, origin: { y: 0.58 } });
    setPhase("RESULTS");
    setPhaseEndsAt(undefined);
    setSequence((value) => value + 1);
  }, [activeSong, currentSingers, mode]);

  const finishSinging = useCallback(() => {
    if (phase !== "SINGING" || finishingRef.current) return;
    finishingRef.current = true;
    const reactionTotal = Object.values(reactions).reduce((sum, value) => sum + value, 0);
    const hypePct = Math.min(100, Math.round((hype / Math.max(1, hypeTarget)) * 100));
    const reactionBoost = Math.min(25, Math.round(reactionTotal * 1.8));
    const showScore = Math.min(100, Math.round(hypePct * 0.78 + reactionBoost));
    setPendingShowScore(showScore);

    if (mode === "DUEL" && currentSingers.length >= 2) {
      duelVotersRef.current.clear();
      setDuelVotes({ left: 0, right: 0 });
      setTimedPhase("DUEL_VOTE", testMode ? 2400 : 6000);
      return;
    }
    finalizePerformance(showScore);
  }, [phase, reactions, hype, hypeTarget, mode, currentSingers.length, setTimedPhase, testMode, finalizePerformance]);

  const resolveDuelVote = useCallback(() => {
    if (currentSingers.length < 2) return finalizePerformance(pendingShowScore);
    const winner = duelVotes.left === duelVotes.right
      ? undefined
      : duelVotes.left > duelVotes.right ? currentSingers[0] : currentSingers[1];
    finalizePerformance(pendingShowScore, winner);
  }, [currentSingers, duelVotes, pendingShowScore, finalizePerformance]);

  const startSpecialEvent = useCallback((forcedKind?: SpecialEventKind, force = false) => {
    if (players.length < 3) {
      startMode();
      return;
    }

    const allKinds: SpecialEventKind[] = ["BLIND_VOTE", "POWER_DRAW", "FATE_VOTE"];
    const unused = allKinds.filter((kind) => !usedSpecialEvents.includes(kind));
    const kind = forcedKind ?? unused[Math.floor(Math.random() * unused.length)];
    if (!kind) {
      startMode();
      return;
    }

    if (!force && usedSpecialEvents.includes(kind)) {
      startMode();
      return;
    }

    setUsedSpecialEvents((prev) => prev.includes(kind) ? prev : [...prev, kind]);
    setLastSpecialPerformanceCount(performances.length);
    setSpecialReveal(undefined);

    if (kind === "BLIND_VOTE") {
      secretVotersRef.current.clear();
      setSecretVotes({});
      setSecretVoteKey(`blind-${roomCode}-${Date.now()}`);
      setTimedPhase("SECRET_VOTE", testMode ? 2400 : 6500);
      return;
    }

    if (kind === "POWER_DRAW") {
      powerDrawJoinersRef.current.clear();
      setPowerDrawJoiners([]);
      setPowerDrawKey(`power-draw-${roomCode}-${Date.now()}`);
      setTimedPhase("POWER_DRAW", testMode ? 2200 : 5200);
      return;
    }

    fateVotersRef.current.clear();
    setFateVotes({ left: 0, right: 0 });
    const availableModes: KaraokeMode[] = players.length >= 4
      ? ["DUO", "BOMB", "RESCUE", "DUEL"]
      : ["DUO", "BOMB", "RESCUE"];
    const shuffled = [...availableModes].sort(() => Math.random() - 0.5);
    fateOutcomesRef.current = { left: shuffled[0] ?? "DUO", right: shuffled[1] ?? "BOMB" };
    setFateVoteKey(`fate-${roomCode}-${Date.now()}`);
    setTimedPhase("FATE_VOTE", testMode ? 2200 : 5200);
  }, [players, usedSpecialEvents, performances.length, roomCode, setTimedPhase, startMode, testMode]);

  const resolveSecretVote = useCallback(() => {
    if (!players.length) return startMode();
    const ranked = players
      .map((player) => ({ name: player.name, votes: secretVotes[player.name] ?? 0, hasPower: Boolean(powers[player.name]) }))
      .sort((a, b) => b.votes - a.votes);
    const maxVotes = ranked[0]?.votes ?? 0;
    let finalists = ranked.filter((entry) => entry.votes === maxVotes);
    const withoutPower = finalists.filter((entry) => !entry.hasPower);
    if (withoutPower.length) finalists = withoutPower;
    const winner = finalists[Math.floor(Math.random() * finalists.length)]?.name ?? players[Math.floor(Math.random() * players.length)].name;
    const roll = Math.random();

    if (roll < 0.5) {
      const currentPower = powers[winner];
      const pool = POWER_KINDS.filter((kind) => kind !== currentPower);
      const power = pool[Math.floor(Math.random() * pool.length)] ?? "PASS";
      setPowers((prev) => ({ ...prev, [winner]: power }));
      setPartyScores((prev) => ({ ...prev, [winner]: (prev[winner] ?? 0) + 60 }));
      setSpecialReveal({ kind: "BLIND_VOTE", title: `${winner} se lleva un poder`, detail: POWER_COPY[power].label, player: winner, power });
    } else if (roll < 0.8) {
      setSpecialReveal({ kind: "BLIND_VOTE", title: `${winner} abre el próximo show`, detail: "El voto era para elegir al próximo cantante.", player: winner, nextSinger: winner });
    } else {
      setPowers((prev) => ({ ...prev, [winner]: "FREE_PICK" }));
      setSpecialReveal({ kind: "BLIND_VOTE", title: `${winner} toma el control`, detail: "Canta el próximo tema y puede elegir cualquiera de la biblioteca.", player: winner, power: "FREE_PICK", nextSinger: winner });
    }

    setTimedPhase("SPECIAL_REVEAL", testMode ? 2200 : 4300);
    confetti({ particleCount: 85, spread: 72, origin: { y: 0.56 } });
  }, [players, secretVotes, powers, setTimedPhase, startMode, testMode]);

  const resolvePowerDraw = useCallback(() => {
    const joined = powerDrawJoiners.length ? powerDrawJoiners : players.map((player) => player.name);
    const withoutPower = joined.filter((name) => !powers[name]);
    const pool = withoutPower.length ? withoutPower : joined;
    if (!pool.length) return startMode();
    const winner = pool[Math.floor(Math.random() * pool.length)];
    const currentPower = powers[winner];
    const available = POWER_KINDS.filter((kind) => kind !== currentPower);
    const power = available[Math.floor(Math.random() * available.length)] ?? "REROLL";
    setPowers((prev) => ({ ...prev, [winner]: power }));
    setPartyScores((prev) => ({ ...prev, [winner]: (prev[winner] ?? 0) + 50 }));
    setSpecialReveal({ kind: "POWER_DRAW", title: `${winner} abrió el sobre`, detail: `Se lleva ${POWER_COPY[power].label}.`, player: winner, power });
    setTimedPhase("SPECIAL_REVEAL", testMode ? 2200 : 4000);
    confetti({ particleCount: 70, spread: 68, origin: { y: 0.58 } });
  }, [powerDrawJoiners, players, powers, setTimedPhase, startMode, testMode]);

  const resolveFateVote = useCallback(() => {
    let side: 0 | 1;
    if (fateVotes.left === fateVotes.right) side = Math.random() < 0.5 ? 0 : 1;
    else side = fateVotes.left > fateVotes.right ? 0 : 1;
    const chosenMode = side === 0 ? fateOutcomesRef.current.left : fateOutcomesRef.current.right;
    const door = side === 0 ? "AZUL" : "ORO";
    setSpecialReveal({ kind: "FATE_VOTE", title: `Eligieron ${door}`, detail: `Atrás estaba ${MODE_COPY[chosenMode].label}.`, forcedMode: chosenMode });
    setTimedPhase("SPECIAL_REVEAL", testMode ? 2200 : 3800);
  }, [fateVotes, setTimedPhase, testMode]);

  const advanceNight = useCallback(() => {
    const allKinds: SpecialEventKind[] = ["BLIND_VOTE", "POWER_DRAW", "FATE_VOTE"];
    const unused = allKinds.filter((kind) => !usedSpecialEvents.includes(kind));
    const performancesSinceSpecial = performances.length - lastSpecialPerformanceCount;
    const canSurprise = players.length >= 3 && unused.length > 0 && performancesSinceSpecial >= 2;
    const shouldSurprise = canSurprise && (performancesSinceSpecial >= 4 || Math.random() < 0.32);

    if (shouldSurprise) startSpecialEvent(unused[Math.floor(Math.random() * unused.length)]);
    else startMode();
  }, [performances.length, lastSpecialPerformanceCount, players.length, usedSpecialEvents, startSpecialEvent, startMode]);

  const consumePower = useCallback((name: string) => {
    setPowers((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const handlePowerAction = useCallback((payload: Record<string, unknown>) => {
    const name = String(payload.name ?? "").trim();
    const kind = String(payload.kind ?? "") as PowerKind;
    if (!name || powers[name] !== kind || !currentSingers.includes(name)) return;

    if (kind === "PASS" && phase === "DRAW") {
      const candidates = players.filter((player) => !currentSingers.includes(player.name));
      const replacement = pickFairSingers(candidates, singerStats, turnNumber, 1)[0];
      if (!replacement) return;
      setCurrentSingers((prev) => prev.map((singer) => singer === name ? replacement : singer));
      setSingerStats((prev) => {
        const next = { ...prev };
        const oldStat = next[name] ?? { count: 1, lastTurn: turnNumber };
        next[name] = { ...oldStat, count: Math.max(0, oldStat.count - 1) };
        const newStat = next[replacement] ?? { count: 0, lastTurn: -999 };
        next[replacement] = { count: newStat.count + 1, lastTurn: turnNumber };
        return next;
      });
      consumePower(name);
      showPowerEvent(name, kind, `${name} usó Paso libre. Entra ${replacement}.`);
      return;
    }

    if (phase !== "SONG_VOTE") return;

    if (kind === "DECIDE") {
      const option = Number(payload.option);
      const selected = songOptions[option];
      if (!selected) return;
      consumePower(name);
      showPowerEvent(name, kind, `${name} usó Última palabra y eligió ${selected.title}.`);
      startSinging(selected);
      return;
    }

    if (kind === "REROLL") {
      const catalog = getCatalog();
      const excluded = new Set(songOptions.map((song) => song.id));
      const freshPool = catalog.filter((song) => !excluded.has(song.id));
      const nextOptions = pickSongOptions(freshPool.length >= 2 ? freshPool : catalog, catalog);
      if (!nextOptions.length) return;
      songVotersRef.current.clear();
      setSongVotes({ left: 0, right: 0 });
      setSongOptions(nextOptions);
      setSongVoteKey(`song-${roomCode}-${Date.now()}`);
      setPhaseEndsAt(Date.now() + (testMode ? 2200 : 6000));
      setSequence((value) => value + 1);
      consumePower(name);
      showPowerEvent(name, kind, `${name} cambió las dos canciones.`);
      return;
    }

    if (kind === "FREE_PICK") {
      const songId = String(payload.songId ?? "");
      const selected = powerSongChoices.find((song) => song.id === songId);
      if (!selected) return;
      consumePower(name);
      showPowerEvent(name, kind, `${name} activó Carta blanca y eligió ${selected.title}.`);
      startSinging(selected);
    }
  }, [powers, currentSingers, phase, players, singerStats, turnNumber, consumePower, showPowerEvent, songOptions, startSinging, getCatalog, roomCode, testMode, powerSongChoices]);

  useEffect(() => {
    powerActionRef.current = handlePowerAction;
  }, [handlePowerAction]);

  useEffect(() => {
    if (!phaseEndsAt) return;
    const delay = Math.max(0, phaseEndsAt - Date.now());
    const timer = window.setTimeout(() => {
      if (phase === "DRAW") {
        if (mode === "RESCUE") setTimedPhase("RESCUE_CALL", testMode ? 2200 : 5000);
        else if (mode === "BOMB" || songOptions.length < 2) startSinging(activeSong ?? songOptions[0]);
        else setTimedPhase("SONG_VOTE", testMode ? 2200 : 6000);
      } else if (phase === "RESCUE_CALL") resolveRescue();
      else if (phase === "SONG_VOTE") resolveSongVote();
      else if (phase === "DUEL_VOTE") resolveDuelVote();
      else if (phase === "SECRET_VOTE") resolveSecretVote();
      else if (phase === "POWER_DRAW") resolvePowerDraw();
      else if (phase === "FATE_VOTE") resolveFateVote();
      else if (phase === "SPECIAL_REVEAL") startMode(specialReveal?.forcedMode, specialReveal?.nextSinger);
    }, delay + 40);
    return () => window.clearTimeout(timer);
  }, [phase, phaseEndsAt, mode, songOptions, activeSong, testMode, setTimedPhase, startSinging, resolveRescue, resolveSongVote, resolveDuelVote, resolveSecretVote, resolvePowerDraw, resolveFateVote, startMode, specialReveal]);

  const toggleTestMode = () => {
    if (testMode) {
      setTestMode(false);
      setPhase("LOBBY");
      setPhaseEndsAt(undefined);
      setPlayers((prev) => prev.filter((player) => !TEST_PLAYER_NAMES.has(player.name)));
      setOnlinePlayers((prev) => prev.filter((name) => !TEST_PLAYER_NAMES.has(name)));
      setPartyScores((prev) => Object.fromEntries(Object.entries(prev).filter(([name]) => !TEST_PLAYER_NAMES.has(name))));
      setPowers((prev) => Object.fromEntries(Object.entries(prev).filter(([name]) => !TEST_PLAYER_NAMES.has(name))));
      setCurrentSingers([]);
      setSongOptions([]);
      setActiveSong(undefined);
      setSequence((value) => value + 1);
      return;
    }

    setTestMode(true);
    setPlayers((prev) => {
      const existing = new Set(prev.map((player) => player.name.toLowerCase()));
      return [...prev, ...TEST_PLAYERS.filter((player) => !existing.has(player.name.toLowerCase()))];
    });
    setOnlinePlayers((prev) => [...new Set([...prev, ...TEST_PLAYERS.map((player) => player.name)])]);
    setPartyScores((prev) => {
      const next = { ...prev };
      TEST_PLAYERS.forEach((player) => { if (next[player.name] === undefined) next[player.name] = 0; });
      return next;
    });
  };

  const simulateTestActivity = () => {
    if (!testMode) return;
    if (phase === "SONG_VOTE") setSongVotes({ left: 4, right: 2 });
    if (phase === "RESCUE_CALL") {
      const candidates = TEST_PLAYERS.map((player) => player.name).filter((name) => !currentSingers.includes(name)).slice(0, 4);
      rescueOffersRef.current = new Set(candidates);
      setRescueOffers(candidates);
    }
    if (phase === "SINGING") {
      setHype(Math.max(hypeTarget + 10, 75));
      setReactions({ fire: 13, heart: 8, clap: 12, skull: 2 });
    }
    if (phase === "DUEL_VOTE") setDuelVotes({ left: 4, right: 2 });
    if (phase === "SECRET_VOTE") {
      const names = TEST_PLAYERS.map((player) => player.name);
      setSecretVotes({ [names[1]]: 4, [names[2]]: 2, [names[3]]: 1 });
      secretVotersRef.current = new Set(names.slice(0, 5));
    }
    if (phase === "POWER_DRAW") {
      const names = TEST_PLAYERS.slice(0, 4).map((player) => player.name);
      powerDrawJoinersRef.current = new Set(names);
      setPowerDrawJoiners(names);
    }
    if (phase === "FATE_VOTE") {
      fateVotersRef.current = new Set(TEST_PLAYERS.slice(0, 6).map((player) => player.name));
      setFateVotes({ left: 4, right: 2 });
    }
  };

  const applyLibrary = useCallback((nextSongs: Song[]) => {
    setSongs(nextSongs);
    setAvailableSongIds(nextSongs.filter((song) => song.title.trim() && /^[\w-]{11}$/.test(song.source.videoId.trim())).map((song) => song.id));
  }, []);

  const openSongManager = useCallback(async () => {
    const fresh = await loadSongs();
    applyLibrary(fresh);
    setShowSongManager(true);
  }, [applyLibrary]);

  const resetRoom = () => {
    if (!window.confirm("¿Reiniciar la noche y borrar puntajes y actuaciones?")) return;
    setPhase("LOBBY");
    setPhaseEndsAt(undefined);
    setPartyScores(Object.fromEntries(players.map((player) => [player.name, 0])));
    setPerformances([]);
    setSingerStats({});
    setTurnNumber(0);
    setHistory([]);
    setPowers({});
    setPowerEvent(undefined);
    setSpecialReveal(undefined);
    setUsedSpecialEvents([]);
    setLastSpecialPerformanceCount(0);
    setHype(0);
    setReactions(EMPTY_REACTIONS);
    setResultTitle("La noche recién empieza");
    setResultDetail("El sistema va mezclando formatos para que no se repita siempre lo mismo.");
    setSequence((value) => value + 1);
  };

  const duelTotal = duelVotes.left + duelVotes.right;
  const duelLeftPct = duelTotal ? Math.round((duelVotes.left / duelTotal) * 100) : 50;
  const duelRightPct = duelTotal ? 100 - duelLeftPct : 50;
  const modeCopy = MODE_COPY[mode];

  return (
    <main className="party-bg party-grid relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[var(--boca-yellow)]" />
      <header className="relative z-40 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#000820]/84 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-4">
          <div className="grid h-11 w-11 place-items-center bg-[var(--boca-yellow)] text-[var(--boca-blue)]"><Mic2 className="h-6 w-6" /></div>
          <div><p className="font-display text-2xl font-black uppercase leading-none">Machi&apos;s Night</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.22em] text-white/42">Sala {roomCode}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-white/60 sm:flex"><Users className="h-4 w-4 text-[var(--boca-yellow)]" /> {onlinePlayers.length} online</div>
          {testMode && <div className="hidden border border-[var(--boca-yellow)]/30 bg-[var(--boca-yellow)]/10 px-3 py-3 text-[10px] font-black uppercase tracking-[.14em] text-[var(--boca-yellow)] sm:block">Modo prueba</div>}
          <button type="button" className={`icon-button ${testMode ? "is-active" : ""}`} onClick={toggleTestMode} title="Modo prueba"><Gamepad2 /></button>
          <button type="button" className="icon-button" onClick={() => void openSongManager()} title="Biblioteca musical"><ListMusic /></button>
          <button type="button" className="icon-button" onClick={resetRoom} title="Reiniciar noche"><Settings2 /></button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-78px)] max-w-[1500px] items-center justify-center px-5 py-8 sm:px-8">
        <AnimatePresence mode="wait">
          {phase === "LOBBY" && (
            <motion.section key="lobby" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid w-full gap-7 lg:grid-cols-[.82fr_1.18fr]">
              <div className="screen-card border-t-4 border-t-[var(--boca-yellow)] p-7 sm:p-9">
                <p className="eyebrow">Conectá el teléfono</p>
                <h1 className="font-display text-[clamp(4rem,8vw,8rem)] font-black uppercase leading-[.8] tracking-tight">Entrá al <span className="text-[var(--boca-yellow)]">show</span></h1>
                <div className="mt-8 flex flex-col items-center gap-5 border border-white/10 bg-white p-5 text-[var(--boca-blue)] sm:flex-row">
                  {joinUrl && <QRCodeSVG value={joinUrl} size={180} bgColor="#ffffff" fgColor="#0033A0" level="M" />}
                  <div><p className="text-xs font-black uppercase tracking-[.18em] text-black/45">Código de sala</p><p className="font-display mt-1 text-5xl font-black uppercase leading-none">{roomCode}</p><p className="mt-3 max-w-xs text-sm font-semibold leading-5 text-black/55">Escaneá una vez. Después el teléfono cambia solo según lo que esté pasando.</p></div>
                </div>
                {!songs.length ? (
                  <button type="button" onClick={() => void openSongManager()} className="primary-button mt-6 w-full justify-center py-4 text-base"><ListMusic className="h-5 w-5" /> Cargar los primeros karaokes</button>
                ) : (
                  <button type="button" disabled={players.length < 2} onClick={() => startMode()} className="primary-button mt-6 w-full justify-center py-4 text-base"><Sparkles className="h-5 w-5" /> Empezar la noche</button>
                )}
                <button type="button" onClick={toggleTestMode} className="secondary-button mt-3 w-full justify-center py-3"><Gamepad2 className="h-5 w-5" /> {testMode ? "Salir del modo prueba" : "Probar yo solo"}</button>
                <p className="mt-4 text-xs font-semibold leading-5 text-white/35">{songs.length} temas cargados. No hay canciones automáticas: la biblioteca es solamente la que armes vos con YouTube.</p>
              </div>

              <div className="screen-card p-7 sm:p-9">
                <div className="mb-7 flex items-end justify-between gap-4"><div><p className="eyebrow">Lobby en vivo</p><h2 className="font-display text-4xl font-black uppercase">{players.length} jugadores</h2></div><div className="text-right"><p className="text-xs font-black uppercase tracking-[.16em] text-white/35">Conectados ahora</p><p className="font-display text-4xl font-black text-[var(--boca-yellow)]">{onlinePlayers.length}</p></div></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {players.map((player) => <div key={player.name} className={`border p-4 ${onlinePlayers.includes(player.name) ? "border-[var(--boca-yellow)]/35 bg-[var(--boca-yellow)]/7" : "border-white/8 bg-white/[.025] opacity-55"}`}><PlayerAvatar avatar={player.avatar} active={onlinePlayers.includes(player.name)} /><p className="font-display mt-4 truncate text-2xl font-black uppercase">{player.name}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.16em] text-white/38">{partyScores[player.name] ?? 0} puntos</p></div>)}
                </div>
                {!players.length && <div className="grid min-h-72 place-items-center border border-dashed border-white/10 text-center text-white/35"><div><Users className="mx-auto mb-4 h-10 w-10" /><p className="font-display text-2xl font-bold uppercase">Esperando jugadores</p></div></div>}
              </div>
            </motion.section>
          )}

          {phase === "DRAW" && (
            <motion.section key="draw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
              <div className="mx-auto mb-5 w-fit border border-[var(--boca-yellow)]/30 bg-[var(--boca-yellow)]/8 px-4 py-2 text-center"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--boca-yellow)]">{modeCopy.kicker}</p><p className="font-display mt-1 text-2xl font-black uppercase">{modeCopy.label}</p></div>
              <SpotlightDraw players={players} selected={currentSingers} endsAt={phaseEndsAt} surpriseSong={mode === "BOMB"} />
            </motion.section>
          )}

          {phase === "RESCUE_CALL" && (
            <motion.section key="rescue" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid w-full gap-7 lg:grid-cols-[1fr_.8fr] lg:items-center">
              <div><p className="eyebrow">Rescate</p><h2 className="font-display text-[clamp(4.5rem,10vw,10rem)] font-black uppercase leading-[.76]">¿Quién se <span className="text-[var(--boca-yellow)]">suma?</span></h2><p className="mt-6 max-w-2xl text-lg font-semibold leading-7 text-white/50">Los celulares tienen un único botón. Entre los que se ofrecen, el sistema elige uno para subir con {currentSingers[0]}.</p><div className="mt-7"><Countdown endsAt={phaseEndsAt} /></div></div>
              <div className="screen-card border-t-4 border-t-[var(--boca-yellow)] p-7"><UserPlus className="h-10 w-10 text-[var(--boca-yellow)]" /><p className="eyebrow mt-5">Voluntarios</p><p className="font-display text-8xl font-black">{rescueOffers.length}</p><div className="mt-5 flex flex-wrap gap-2">{rescueOffers.slice(0, 8).map((name) => <span key={name} className="border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase">{name}</span>)}</div></div>
            </motion.section>
          )}

          {phase === "SONG_VOTE" && (
            <motion.section key="song-vote" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-6xl">
              <div className="mb-7 flex items-end justify-between gap-5"><div><p className="eyebrow">{modeCopy.label}</p><h2 className="font-display text-[clamp(3.7rem,7vw,7rem)] font-black uppercase leading-[.85]">Elijan el <span className="text-[var(--boca-yellow)]">tema</span></h2><p className="mt-3 text-sm font-semibold uppercase tracking-[.12em] text-white/40">Cantan {currentSingers.join(" & ")}</p></div><Countdown endsAt={phaseEndsAt} /></div>
              <div className="grid gap-5 md:grid-cols-2">
                {songOptions.slice(0, 2).map((song, index) => <div key={song.id} className={`screen-card border-t-4 p-8 ${index === 0 ? "border-t-[var(--boca-yellow)]" : "border-t-white"}`}><p className="eyebrow">Opción {index + 1}</p><p className="font-display mt-3 text-5xl font-black uppercase leading-[.88]">{song.title}</p><p className="mt-4 text-sm font-bold uppercase tracking-[.13em] text-white/40">{song.artist}</p><p className="font-display mt-10 text-7xl font-black text-[var(--boca-yellow)]">{index === 0 ? songVotes.left : songVotes.right}</p><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/30">votos</p></div>)}
              </div>
            </motion.section>
          )}

          {phase === "SINGING" && activeSong && (
            <motion.section key="singing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex flex-col bg-black">
              <div className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#00113b]/94 px-5 py-3 sm:px-7">
                <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--boca-yellow)]">{modeCopy.label} · {currentSingers.join(" & ")}</p><p className="font-display truncate text-2xl font-black uppercase sm:text-3xl">{activeSong.title} <span className="text-white/35">· {activeSong.artist}</span></p></div>
                <div className="flex items-center gap-3"><div className="w-44 sm:w-64"><div className="mb-1 flex justify-between text-[9px] font-black uppercase tracking-[.12em] text-white/45"><span>Hype</span><span>{Math.min(100, Math.round((hype / Math.max(1, hypeTarget)) * 100))}%</span></div><div className="h-2 bg-white/10"><div className="h-full bg-[var(--boca-yellow)] transition-[width]" style={{ width: `${Math.min(100, (hype / Math.max(1, hypeTarget)) * 100)}%` }} /></div></div><button type="button" className="primary-button" onClick={finishSinging}>Terminar</button></div>
              </div>
              <div className="min-h-0 flex-1"><KaraokePlayer song={activeSong} onEnded={finishSinging} /></div>
              <div className="absolute bottom-6 left-6 z-20 flex gap-2 rounded-full border border-white/10 bg-[#000820]/88 p-2 backdrop-blur-xl"><span className="flex items-center gap-2 px-3 text-xs font-black"><Flame className="h-4 w-4 text-[var(--boca-yellow)]" /> {reactions.fire}</span><span className="flex items-center gap-2 px-3 text-xs font-black"><Heart className="h-4 w-4 text-[var(--boca-yellow)]" /> {reactions.heart}</span><span className="flex items-center gap-2 px-3 text-xs font-black"><Activity className="h-4 w-4 text-[var(--boca-yellow)]" /> {reactions.clap}</span><span className="flex items-center gap-2 px-3 text-xs font-black"><Skull className="h-4 w-4 text-[var(--boca-yellow)]" /> {reactions.skull}</span></div>
            </motion.section>
          )}

          {phase === "DUEL_VOTE" && currentSingers.length >= 2 && (
            <motion.section key="duel-vote" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-6xl">
              <div className="mb-8 flex items-end justify-between gap-5"><div><p className="eyebrow">Duelo</p><h2 className="font-display text-[clamp(4rem,8vw,8rem)] font-black uppercase leading-[.8]">¿Quién se quedó con el <span className="text-[var(--boca-yellow)]">show?</span></h2></div><Countdown endsAt={phaseEndsAt} /></div>
              <div className="grid gap-5 md:grid-cols-2"><div className="screen-card border-t-4 border-t-[var(--boca-yellow)] p-8"><Swords className="h-9 w-9 text-[var(--boca-yellow)]" /><p className="font-display mt-6 text-6xl font-black uppercase">{currentSingers[0]}</p><p className="font-display mt-10 text-8xl font-black text-[var(--boca-yellow)]">{duelLeftPct}%</p></div><div className="screen-card border-t-4 border-t-white p-8"><Swords className="h-9 w-9 text-white" /><p className="font-display mt-6 text-6xl font-black uppercase">{currentSingers[1]}</p><p className="font-display mt-10 text-8xl font-black">{duelRightPct}%</p></div></div>
            </motion.section>
          )}

          {phase === "SECRET_VOTE" && (
            <motion.section key="secret-vote" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-5xl text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center border border-[var(--boca-yellow)]/40 bg-[var(--boca-yellow)]/10 text-[var(--boca-yellow)]"><Vote className="h-8 w-8" /></div>
              <p className="eyebrow mt-7">Momento sorpresa</p>
              <h2 className="font-display text-[clamp(5rem,12vw,12rem)] font-black uppercase leading-[.72]">Elegí a <span className="text-[var(--boca-yellow)]">alguien</span></h2>
              <p className="mx-auto mt-7 max-w-2xl text-xl font-semibold leading-8 text-white/55">Nadie sabe qué está eligiendo. Puede terminar en un poder, en el próximo cantante o en control total del siguiente tema.</p>
              <div className="mt-8 flex items-center justify-center gap-8"><div><p className="font-display text-7xl font-black text-[var(--boca-yellow)]">{Object.values(secretVotes).reduce((sum, value) => sum + value, 0)}</p><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">votos enviados</p></div><Countdown endsAt={phaseEndsAt} /></div>
            </motion.section>
          )}

          {phase === "POWER_DRAW" && (
            <motion.section key="power-draw" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-5xl text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center bg-[var(--boca-yellow)] text-[var(--boca-blue)]"><Gift className="h-8 w-8" /></div>
              <p className="eyebrow mt-7">Sobre dorado</p>
              <h2 className="font-display text-[clamp(5rem,11vw,11rem)] font-black uppercase leading-[.74]">¿Quién se <span className="text-[var(--boca-yellow)]">arriesga?</span></h2>
              <p className="mx-auto mt-7 max-w-2xl text-xl font-semibold leading-8 text-white/55">En los teléfonos aparece un solo botón. Entre los que se anotan, uno se lleva un poder al azar.</p>
              <div className="mt-8 flex items-center justify-center gap-8"><div><p className="font-display text-7xl font-black text-[var(--boca-yellow)]">{powerDrawJoiners.length}</p><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">se la jugaron</p></div><Countdown endsAt={phaseEndsAt} /></div>
            </motion.section>
          )}

          {phase === "FATE_VOTE" && (
            <motion.section key="fate-vote" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-6xl text-center">
              <p className="eyebrow">Dos puertas</p>
              <h2 className="font-display text-[clamp(4.5rem,10vw,10rem)] font-black uppercase leading-[.76]">Elijan sin saber <span className="text-[var(--boca-yellow)]">qué hay atrás</span></h2>
              <div className="mt-9 grid gap-5 md:grid-cols-2">
                <div className="border-2 border-[#0d4ed8] bg-[#052269] p-8"><p className="font-display text-6xl font-black uppercase">Azul</p><p className="font-display mt-7 text-8xl font-black">{fateVotes.left}</p></div>
                <div className="border-2 border-[var(--boca-yellow)] bg-[var(--boca-yellow)] p-8 text-[var(--boca-blue)]"><p className="font-display text-6xl font-black uppercase">Oro</p><p className="font-display mt-7 text-8xl font-black">{fateVotes.right}</p></div>
              </div>
              <div className="mt-7"><Countdown endsAt={phaseEndsAt} /></div>
            </motion.section>
          )}

          {phase === "SPECIAL_REVEAL" && specialReveal && (
            <motion.section key="special-reveal" initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-5xl text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center bg-[var(--boca-yellow)] text-[var(--boca-blue)]"><Sparkles className="h-8 w-8" /></div>
              <p className="eyebrow mt-7">Se revela ahora</p>
              <h2 className="font-display text-[clamp(4rem,9vw,9rem)] font-black uppercase leading-[.78]">{specialReveal.title}</h2>
              <div className="mx-auto mt-7 max-w-3xl border-y border-[var(--boca-yellow)]/30 py-6">
                <p className="font-display text-3xl font-black uppercase text-[var(--boca-yellow)]">{specialReveal.detail}</p>
                {specialReveal.power && <p className="mx-auto mt-3 max-w-xl text-base font-semibold leading-7 text-white/50">{POWER_COPY[specialReveal.power].detail}</p>}
              </div>
              <div className="mt-7"><Countdown endsAt={phaseEndsAt} /></div>
            </motion.section>
          )}

          {phase === "RESULTS" && (
            <motion.section key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid w-full gap-7 lg:grid-cols-[1fr_.82fr]">
              <div className="screen-card border-t-4 border-t-[var(--boca-yellow)] p-7 sm:p-10"><p className="eyebrow">Resultado</p><h2 className="font-display max-w-4xl text-[clamp(4rem,8vw,8rem)] font-black uppercase leading-[.82]">{resultTitle}</h2><p className="mt-7 max-w-2xl text-lg font-semibold leading-7 text-white/55">{resultDetail}</p><div className="mt-9"><button type="button" className="primary-button w-full justify-center py-4" onClick={advanceNight}><Sparkles className="h-5 w-5" /> Seguir la noche</button></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"><button type="button" className="secondary-button justify-center" onClick={() => startMode("EXPRESS")}><Mic2 className="h-4 w-4" /> Express</button><button type="button" className="secondary-button justify-center" onClick={() => startMode("DUO")}><Users className="h-4 w-4" /> Dúo</button><button type="button" className="secondary-button justify-center" onClick={() => startMode("BOMB")}><Bomb className="h-4 w-4" /> Bomba</button><button type="button" className="secondary-button justify-center" onClick={() => startMode("RESCUE")}><Hand className="h-4 w-4" /> Rescate</button><button type="button" className="secondary-button justify-center" onClick={() => startMode("DUEL")}><Swords className="h-4 w-4" /> Duelo</button></div></div>
              <div className="screen-card p-7 sm:p-9"><div className="mb-6 flex items-center justify-between"><div><p className="eyebrow">Party ranking</p><h3 className="font-display text-4xl font-black uppercase">Top de la noche</h3></div><Trophy className="h-9 w-9 text-[var(--boca-yellow)]" /></div><div className="space-y-2">{sortedScores.slice(0, 7).map(([name, score], index) => <div key={name} className="flex items-center justify-between border-b border-white/8 py-3"><div className="flex items-center gap-4"><span className="font-display w-7 text-3xl font-black text-[var(--boca-yellow)]">{index + 1}</span><span className="font-display text-2xl font-black uppercase">{name}</span></div><span className="font-display text-3xl font-black">{score}</span></div>)}</div>{!sortedScores.length && <div className="grid min-h-60 place-items-center text-white/30"><BarChart3 className="h-12 w-12" /></div>}</div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {testMode && (
        <aside className="fixed bottom-4 right-4 z-[90] w-[min(390px,calc(100vw-2rem))] border-2 border-[var(--boca-yellow)] bg-[#000820]/96 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Modo prueba</p><p className="font-display text-2xl font-black uppercase">Probalo vos solo</p></div><Gamepad2 className="h-7 w-7 text-[var(--boca-yellow)]" /></div>
          <p className="mt-2 text-xs font-semibold leading-5 text-white/45">Seis jugadores ficticios y tiempos cortos. Elegí directamente qué formato querés revisar.</p>
          <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" className="secondary-button justify-center" onClick={() => startMode("EXPRESS")}><Mic2 className="h-4 w-4" /> Express</button><button type="button" className="secondary-button justify-center" onClick={() => startMode("DUO")}><Users className="h-4 w-4" /> Dúo</button><button type="button" className="secondary-button justify-center" onClick={() => startMode("BOMB")}><Bomb className="h-4 w-4" /> Bomba</button><button type="button" className="secondary-button justify-center" onClick={() => startMode("RESCUE")}><Hand className="h-4 w-4" /> Rescate</button><button type="button" className="secondary-button justify-center" onClick={() => startMode("DUEL")}><Swords className="h-4 w-4" /> Duelo</button><button type="button" className="secondary-button justify-center" onClick={() => startSpecialEvent("BLIND_VOTE", true)}><Vote className="h-4 w-4" /> Voto misterio</button><button type="button" className="secondary-button justify-center" onClick={() => startSpecialEvent("POWER_DRAW", true)}><Gift className="h-4 w-4" /> Sobre dorado</button><button type="button" className="secondary-button justify-center" onClick={() => startSpecialEvent("FATE_VOTE", true)}><Sparkles className="h-4 w-4" /> Dos puertas</button><button type="button" className="secondary-button justify-center" onClick={() => void openSongManager()}><ListMusic className="h-4 w-4" /> Temas</button></div>
          {["SONG_VOTE", "RESCUE_CALL", "SINGING", "DUEL_VOTE", "SECRET_VOTE", "POWER_DRAW", "FATE_VOTE"].includes(phase) && <button type="button" className="primary-button mt-2 w-full justify-center" onClick={simulateTestActivity}>Simular teléfonos ahora</button>}
          {phase === "SINGING" && <button type="button" className="secondary-button mt-2 w-full justify-center" onClick={finishSinging}>Terminar canción</button>}
          <button type="button" className="mt-3 w-full text-center text-[10px] font-black uppercase tracking-[.16em] text-white/35 hover:text-white" onClick={toggleTestMode}>Cerrar prueba y quitar jugadores ficticios</button>
        </aside>
      )}

      <AnimatePresence>
        {powerEvent && (
          <motion.div initial={{ opacity: 0, y: -24, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16 }} className="fixed left-1/2 top-24 z-[110] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 border-2 border-[var(--boca-yellow)] bg-[#00113b]/96 px-6 py-5 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--boca-yellow)]">Poder activado · {POWER_COPY[powerEvent.kind].label}</p>
            <p className="font-display mt-2 text-3xl font-black uppercase">{powerEvent.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {showSongManager && <SongManager songs={songs} onChange={applyLibrary} onClose={() => setShowSongManager(false)} />}
    </main>
  );
}
