"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic2, Play, Users, Star, Trophy, ChevronDown, ListOrdered } from "lucide-react";
import YouTube from "react-youtube";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase"; // Asegurate de que esta ruta apunte a tu archivo supabase.ts

const SONGS = [
  { id: "1", title: "Los Del Espacio", artist: "LIT killah, Duki, Emilia...", youtubeId: "emTC0FBpyeg" },
  { id: "2", title: "De Música Ligera", artist: "Soda Stereo", youtubeId: "X5iGNQN_Ijg" },
];

const WHEEL_COLORS = ["#6366f1", "#ec4899", "#8b5cf6", "#f59e0b", "#10b981", "#3b82f6", "#f43f5e"];

const TOURNAMENT_ROUNDS = [
  { id: 1, name: "Ronda 1: Solistas", type: 1, totalTurns: 5 },
  { id: 2, name: "Ronda 2: Dúos", type: 2, totalTurns: 3 },
  { id: 3, name: "Ronda 3: Tríos", type: 3, totalTurns: 2 },
];

type ScoreEntry = { singers: string[]; actitud: number; ganas: number; voz: number; total: number; };

export default function KaraokeRoulette() {
  // 1. Estados
  const [step, setStep] = useState<"LOBBY" | "ROULETTE" | "VOTING" | "PLAYING" | "RATING" | "LEADERBOARD">("LOBBY");
  const [players, setPlayers] = useState<string[]>([]);
  const [newPlayer, setNewPlayer] = useState("");
  
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [currentSingers, setCurrentSingers] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  
  const [votes, setVotes] = useState({ song1: 0, song2: 0 });
  const [winnerSong, setWinnerSong] = useState(SONGS[0]);
  const [ratings, setRatings] = useState({ actitud: 0, ganas: 0, voz: 0 });
  
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showPartners, setShowPartners] = useState(false);

  const currentRound = TOURNAMENT_ROUNDS[currentRoundIdx];

  // 2. Parámetros de la URL
  const params = useParams();
  const roomCode = params.roomCode as string;

  // 3. Funciones de Juego
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayer.trim() && !players.includes(newPlayer)) {
      setPlayers((prev) => [...prev, newPlayer]);
      setNewPlayer("");
    }
  };

  const startRoulette = () => {
    if (players.length < 3) return alert("¡Agregá al menos 3 personas!");
    setStep("ROULETTE");
    setIsSpinning(true);
    setShowPartners(false);
    setRatings({ actitud: 0, ganas: 0, voz: 0 });

    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, currentRound.type);
    
    const captainIdx = players.indexOf(selected[0]);
    const sliceAngle = 360 / players.length;
    const sliceCenter = (captainIdx * sliceAngle) + (sliceAngle / 2);
    const spins = 360 * 5;
    const targetRotation = wheelRotation + spins + (360 - sliceCenter) - (wheelRotation % 360);

    setWheelRotation(targetRotation);
    setCurrentSingers(selected);
  };

  const onSpinComplete = () => {
    setIsSpinning(false);
    if (currentRound.type > 1) {
      setTimeout(() => setShowPartners(true), 500);
      setTimeout(() => setStep("VOTING"), 4000);
    } else {
      setTimeout(() => setStep("VOTING"), 2500);
    }
  };

  // Usamos el callback en setVotes para evitar problemas de sincronización con los celulares
  const handleVote = (songNum: 1 | 2) => {
    setVotes((prev) => {
      const newVotes = { ...prev };
      songNum === 1 ? newVotes.song1++ : newVotes.song2++;
      
      if (newVotes.song1 + newVotes.song2 >= 5) {
        setWinnerSong(newVotes.song1 > newVotes.song2 ? SONGS[0] : SONGS[1]);
        setStep("PLAYING");
      }
      return newVotes;
    });
  };

  const handleRate = (category: keyof typeof ratings, score: number) => {
    setRatings(prev => ({ ...prev, [category]: score }));
  };

  const saveScoreAndContinue = () => {
    if (ratings.actitud === 0 || ratings.ganas === 0 || ratings.voz === 0) {
      return alert("Falta puntuar alguna categoría");
    }
    const total = ratings.actitud + ratings.ganas + ratings.voz;
    setLeaderboard([...leaderboard, { singers: currentSingers, ...ratings, total }]);
    
    if (currentTurn < currentRound.totalTurns) {
      setCurrentTurn(currentTurn + 1);
    } else if (currentRoundIdx < TOURNAMENT_ROUNDS.length - 1) {
      setCurrentRoundIdx(currentRoundIdx + 1);
      setCurrentTurn(1);
    } else {
      alert("¡Torneo Finalizado!");
    }
    
    setVotes({ song1: 0, song2: 0 });
    setStep("LEADERBOARD");
  };

  // 4. Conexión en Tiempo Real con los Celulares
  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`room-${roomCode}`);

    channel
      .on("broadcast", { event: "new_player" }, (data) => {
        setPlayers((prev) => {
          if (!prev.includes(data.payload.name)) {
            return [...prev, data.payload.name];
          }
          return prev;
        });
      })
      .on("broadcast", { event: "vote_song" }, (data) => {
        handleVote(data.payload.songNum);
      })
      .on("broadcast", { event: "rate_singer" }, (data) => {
        handleRate(data.payload.category as keyof typeof ratings, data.payload.score);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // 5. Interfaz Visual
  return (
    <div className="relative min-h-screen text-white flex flex-col items-center justify-center p-4 font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* VIDEO DE FONDO */}
      <div className="absolute inset-0 z-[-1]">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover opacity-60"
        >
          <source src="https://cdn.pixabay.com/video/2020/02/20/32617-393282433_large.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[4px]"></div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* --- FASE 1: LOBBY --- */}
        {step === "LOBBY" && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md relative z-10">
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-lg">
                Karaoke Night
              </h1>
              <p className="text-zinc-300 font-medium">Sala: {roomCode}</p>
            </div>

            <form onSubmit={handleAddPlayer} className="flex gap-2 mb-8">
              <input
                type="text"
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                placeholder="Ingresar manual..."
                className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors text-white placeholder:text-zinc-400 shadow-xl"
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-6 rounded-xl font-bold text-xl shadow-lg shadow-indigo-500/30 transition-all">+</button>
            </form>

            <div className="space-y-2 mb-8 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {players.map((p, i) => (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} key={i} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center gap-3 shadow-lg">
                    <Users className="w-4 h-4 text-indigo-300" />
                    <span className="font-semibold">{p}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {players.length >= 3 && (
              <button onClick={startRoulette} className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                <Play className="w-5 h-5" fill="currentColor" /> Empezar Torneo
              </button>
            )}
          </motion.div>
        )}

        {/* --- FASE 2: RULETA --- */}
        {step === "ROULETTE" && (
          <motion.div key="roulette" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center w-full max-w-md flex flex-col items-center relative z-10">
            <div className="mb-8 bg-black/40 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
              <h3 className="text-indigo-300 font-bold tracking-widest uppercase text-sm mb-1">{currentRound.name} (Turno {currentTurn}/{currentRound.totalTurns})</h3>
              <h2 className="text-3xl font-bold drop-shadow-lg">
                {isSpinning ? "Girando..." : currentRound.type === 1 ? `¡Canta ${currentSingers[0]}!` : `Capitán: ${currentSingers[0]}`}
              </h2>
            </div>

            <div className="relative w-80 h-80 mb-12">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                <ChevronDown className="w-14 h-14" fill="currentColor" />
              </div>
              <motion.div
                className="w-full h-full rounded-full border-[6px] border-white/30 shadow-[0_0_50px_rgba(99,102,241,0.5)] overflow-hidden relative backdrop-blur-sm"
                animate={{ rotate: wheelRotation }}
                transition={{ duration: 5, ease: [0.2, 0.8, 0.1, 1] }}
                onAnimationComplete={onSpinComplete}
                style={{
                  background: `conic-gradient(${players.map((_, i) => {
                    const slice = 360 / players.length;
                    return `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * slice}deg ${(i + 1) * slice}deg`;
                  }).join(', ')})`
                }}
              >
                {players.map((player, i) => {
                  const slice = 360 / players.length;
                  const rotation = (i * slice) + (slice / 2);
                  return (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${rotation}deg)` }}>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 pt-4 origin-bottom h-1/2 font-black text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] whitespace-nowrap">{player}</div>
                    </div>
                  );
                })}
              </motion.div>
            </div>

            <AnimatePresence>
              {showPartners && currentRound.type > 1 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-indigo-900/60 backdrop-blur-lg border border-indigo-500/50 p-5 rounded-2xl shadow-2xl">
                  <p className="text-indigo-200 text-sm mb-2 font-medium">Acompañado por:</p>
                  <div className="flex gap-4 justify-center text-2xl font-black drop-shadow-md">
                    {currentSingers.slice(1).map((partner, i) => (
                      <span key={i} className="text-white">{partner}</span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* --- FASE 3: VOTACIÓN --- */}
        {step === "VOTING" && (
          <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl text-center relative z-10">
            <div className="bg-black/40 inline-block px-8 py-4 rounded-3xl backdrop-blur-md border border-white/10 mb-8">
              <h2 className="text-4xl font-bold mb-2">¿Qué cantan?</h2>
              <p className="text-indigo-300 font-medium text-xl">{currentSingers.join(" + ")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((num) => {
                const song = SONGS[num - 1];
                const songVotes = num === 1 ? votes.song1 : votes.song2;
                return (
                  <motion.button key={num} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={() => handleVote(num as 1 | 2)} className="relative overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-left hover:border-indigo-400 group cursor-pointer shadow-2xl">
                    <div className="relative z-10">
                      <h3 className="text-2xl font-bold mb-1">{song.title}</h3>
                      <p className="text-zinc-300 mb-6">{song.artist}</p>
                      <div className="flex justify-between items-center font-mono bg-black/30 p-3 rounded-xl border border-white/5">
                        <span className="text-zinc-400">Votos</span>
                        <span className="text-4xl font-black text-indigo-400 drop-shadow-md">{songVotes}</span>
                      </div>
                    </div>
                    <motion.div className="absolute bottom-0 left-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300" initial={{ width: 0 }} animate={{ width: `${(songVotes / 5) * 100}%` }} />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* --- FASE 4: SHOW YOUTUBE --- */}
        {step === "PLAYING" && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-5xl text-center relative z-10">
            <div className="bg-black/50 inline-block px-8 py-3 rounded-2xl backdrop-blur-md border border-white/10 mb-6">
              <h2 className="text-3xl font-bold text-white drop-shadow-lg">{currentSingers.join(" & ")}</h2>
            </div>
            <div className="aspect-video w-full rounded-3xl overflow-hidden border border-white/20 shadow-[0_0_80px_rgba(0,0,0,0.8)] bg-black mb-8 relative">
              <YouTube 
                videoId={winnerSong.youtubeId} 
                opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1, controls: 1 } }}
                className="absolute inset-0 w-full h-full"
                onEnd={() => setStep("RATING")}
              />
            </div>
            <button onClick={() => setStep("RATING")} className="bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-2 rounded-full backdrop-blur-md transition-all">
              Terminar y puntuar
            </button>
          </motion.div>
        )}

        {/* --- FASE 5: JURADO MULTI-CATEGORÍA --- */}
        {step === "RATING" && (
          <motion.div key="rating" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white/10 border border-white/20 p-8 rounded-3xl backdrop-blur-xl shadow-2xl relative z-10">
            <h2 className="text-4xl font-bold mb-2 text-center drop-shadow-md">¡A Votar!</h2>
            <p className="text-indigo-300 mb-8 text-center font-medium text-lg">{currentSingers.join(" & ")}</p>

            <div className="space-y-6 mb-10">
              {[
                { key: "actitud", label: "Actitud en Escenario" },
                { key: "ganas", label: "Ganas / Energía" },
                { key: "voz", label: "Afinación / Voz" }
              ].map((cat) => (
                <div key={cat.key} className="flex flex-col items-center bg-black/40 p-5 rounded-2xl border border-white/5">
                  <span className="text-sm text-zinc-300 mb-3 font-bold tracking-widest uppercase">{cat.label}</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRate(cat.key as any, star)}
                        className={`${ratings[cat.key as keyof typeof ratings] >= star ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" : "text-white/20"} transition-all`}
                      >
                        <Star className="w-10 h-10" strokeWidth={1.5} fill="currentColor" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={saveScoreAndContinue} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)]">
              Guardar Puntaje
            </button>
          </motion.div>
        )}

        {/* --- FASE 6: TABLA DE POSICIONES --- */}
        {step === "LEADERBOARD" && (
          <motion.div key="leaderboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl relative z-10">
            <div className="bg-black/50 inline-flex items-center gap-4 px-8 py-4 rounded-3xl backdrop-blur-md border border-white/10 mb-8 mx-auto flex justify-center w-max">
              <ListOrdered className="w-8 h-8 text-indigo-400" />
              <h2 className="text-4xl font-bold">Ranking General</h2>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-3xl overflow-hidden backdrop-blur-xl mb-8 shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/60 text-indigo-200 text-sm uppercase tracking-widest">
                    <th className="p-5 font-bold">Cantantes</th>
                    <th className="p-5 text-center font-bold">Actitud</th>
                    <th className="p-5 text-center font-bold">Ganas</th>
                    <th className="p-5 text-center font-bold">Voz</th>
                    <th className="p-5 text-center font-black text-white">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {[...leaderboard].sort((a, b) => b.total - a.total).map((entry, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                      <td className="p-5 font-bold text-lg">{entry.singers.join(" & ")}</td>
                      <td className="p-5 text-center text-zinc-300 font-mono text-lg">{entry.actitud} <Star className="w-4 h-4 inline text-yellow-500 mb-1" fill="currentColor"/></td>
                      <td className="p-5 text-center text-zinc-300 font-mono text-lg">{entry.ganas} <Star className="w-4 h-4 inline text-yellow-500 mb-1" fill="currentColor"/></td>
                      <td className="p-5 text-center text-zinc-300 font-mono text-lg">{entry.voz} <Star className="w-4 h-4 inline text-yellow-500 mb-1" fill="currentColor"/></td>
                      <td className="p-5 text-center font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 group-hover:scale-110 transition-transform">{entry.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={startRoulette} className="w-full max-w-md mx-auto block bg-white text-black py-4 rounded-xl font-bold text-xl hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              Siguiente Turno
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}