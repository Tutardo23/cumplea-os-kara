"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic2, Play, Trophy, ChevronDown, ListOrdered, Star } from "lucide-react";
import YouTube from "react-youtube";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SONGS = [
  { id: "1", title: "Los Del Espacio", artist: "LIT killah, Duki, Emilia...", youtubeId: "emTC0FBpyeg" },
  { id: "2", title: "Baby", artist: "Justin Bieber ft. Ludacris", youtubeId: "1a5SWpp9Wfg" },
  { id: "3", title: "La Morocha", artist: "Luck Ra, BM", youtubeId: "SjIkoBNZOOQ" },
  { id: "4", title: "Quevedo: Bzrp Session, Vol. 52", artist: "Bizarrap, Quevedo", youtubeId: "ymWTYk90NcU" },
  { id: "5", title: "Un Finde", artist: "Big One, FMK, Ke Personajes", youtubeId: "eY7H7_U0H0Q" },
  { id: "6", title: "Danza Kuduro", artist: "Don Omar, Lucenzo", youtubeId: "QSWmgNMK-VM" },
  { id: "7", title: "De Música Ligera", artist: "Soda Stereo", youtubeId: "X5iGNQN_Ijg" },
  { id: "8", title: "Givenchy", artist: "Duki", youtubeId: "vbyrN_5vU-8" },
  { id: "9", title: "Tusa", artist: "Karol G, Nicki Minaj", youtubeId: "zGL6g6_6GUM" },
  { id: "10", title: "La Bachata", artist: "Manuel Turizo", youtubeId: "tLPUmT6s8O8" },
];
const TOURNAMENT_ROUNDS = [
  { id: 1, name: "Ronda 1: Solos", type: 1, totalTurns: 4 },
  { id: 2, name: "Ronda 2: Dúos", type: 2, totalTurns: 3 },
];

const WHEEL_COLORS = ["#4f46e5", "#db2777", "#7c3aed", "#ea580c", "#059669"];

type ScoreEntry = { singers: string[]; total: number; };

export default function KaraokeRoulette() {
  const [step, setStep] = useState<"LOBBY" | "ROULETTE" | "VOTING" | "PLAYING" | "RATING" | "LEADERBOARD">("LOBBY");
  const [players, setPlayers] = useState<string[]>([]);
  const [newPlayer, setNewPlayer] = useState("");
  
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [currentSingers, setCurrentSingers] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  
  const [votes, setVotes] = useState({ song1: 0, song2: 0 });
  const [winnerSong, setWinnerSong] = useState(SONGS[0]);
  const [ratings, setRatings] = useState({ total: 0, count: 0 });
  
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const currentRound = TOURNAMENT_ROUNDS[currentRoundIdx];
  const params = useParams();
  const roomCode = params.roomCode as string;

  // 1. Avisar a los celulares el estado actual
  useEffect(() => {
    if (!roomCode) return;
    supabase.channel(`room-${roomCode}`).send({ 
      type: "broadcast", event: "sync_step", payload: { step } 
    });
  }, [step, roomCode]);

  // 2. RECIBIR EVENTOS (Arreglo definitivo: sin dependencias que reinicien la conexión)
  useEffect(() => {
    if (!roomCode) return;
    const channel = supabase.channel(`room-${roomCode}`);
    
    channel
      .on("broadcast", { event: "new_player" }, (data) => {
        setPlayers((prev) => !prev.includes(data.payload.name) ? [...prev, data.payload.name] : prev);
      })
      .on("broadcast", { event: "vote" }, (data) => {
        // Actualizamos estado funcionalmente para no tener Stale Closures
        setVotes((prev) => {
          const next = { ...prev };
          data.payload.songNum === 1 ? next.song1++ : next.song2++;
          return next;
        });
      })
      .on("broadcast", { event: "rate" }, (data) => {
        setRatings((prev) => ({
          total: prev.total + data.payload.score,
          count: prev.count + 1
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomCode]); // <- Al estar vacío, NUNCA se desconecta al votar.

  // 3. VIGILANTE DE VOTOS (Revisa los votos y cambia de pantalla)
  useEffect(() => {
    if (step === "VOTING" && (votes.song1 + votes.song2 >= 3)) { // 3 votos para ganar en la demo
      setWinnerSong(votes.song1 > votes.song2 ? SONGS[0] : SONGS[1]);
      setTimeout(() => setStep("PLAYING"), 1000);
    }
  }, [votes, step]);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayer.trim() && !players.includes(newPlayer)) {
      setPlayers((prev) => [...prev, newPlayer]);
      setNewPlayer("");
    }
  };

  const startRoulette = () => {
    if (players.length < 3) return alert("¡Mínimo 3 jugadores!");
    setStep("ROULETTE");
    setIsSpinning(true);
    
    // Reset
    setVotes({ song1: 0, song2: 0 });
    setRatings({ total: 0, count: 0 });

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
    setTimeout(() => setStep("VOTING"), 2500);
  };

  const saveScoreAndContinue = () => {
    if (ratings.count === 0) return alert("¡Nadie votó desde el celu!");
    const finalScore = Math.round(ratings.total / ratings.count);
    
    setLeaderboard([...leaderboard, { singers: currentSingers, total: finalScore }]);
    
    if (currentTurn < currentRound.totalTurns) {
      setCurrentTurn(currentTurn + 1);
    } else if (currentRoundIdx < TOURNAMENT_ROUNDS.length - 1) {
      setCurrentRoundIdx(currentRoundIdx + 1);
      setCurrentTurn(1);
    }
    setStep("LEADERBOARD");
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
      <AnimatePresence mode="wait">
        
        {/* --- FASE 1: LOBBY --- */}
        {step === "LOBBY" && (
          <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-4xl text-center">
            <h1 className="text-7xl font-black mb-8 text-white drop-shadow-xl">
              Matías&apos; Fest
            </h1>
            <div className="bg-white/10 backdrop-blur-md inline-block px-10 py-4 rounded-3xl border-2 border-white/20 shadow-xl mb-12">
                <span className="text-2xl font-bold text-zinc-300">Sala: <strong className="text-indigo-400 text-3xl">{roomCode}</strong></span>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border-2 border-white/10 p-10 rounded-[2rem] shadow-2xl mb-10">
              <form onSubmit={handleAddPlayer} className="flex gap-4 mb-10">
                <input
                  type="text"
                  value={newPlayer}
                  onChange={(e) => setNewPlayer(e.target.value)}
                  placeholder="Agregar jugador..."
                  className="flex-1 bg-black/40 border-2 border-white/20 rounded-2xl px-6 py-4 text-2xl outline-none focus:border-indigo-500 text-white transition-all"
                />
                <button type="submit" className="bg-white text-black px-10 rounded-2xl font-black text-3xl hover:bg-zinc-200 transition-colors">
                  +
                </button>
              </form>
              
              <div className="flex flex-wrap justify-center gap-4">
                <AnimatePresence>
                  {players.map((p, i) => (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} key={i} className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3 flex items-center gap-3">
                      <Mic2 className="w-6 h-6 text-indigo-400" />
                      <span className="font-bold text-2xl">{p}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {players.length >= 3 && (
              <button onClick={startRoulette} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-3xl font-black text-3xl shadow-xl transition-colors">
                ¡EMPEZAR EL JUEGO!
              </button>
            )}
          </motion.div>
        )}

        {/* --- FASE 2: RULETA --- */}
        {step === "ROULETTE" && (
          <motion.div key="roulette" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full flex flex-col items-center">
            <h2 className="text-5xl font-black mb-12 text-white bg-white/10 px-10 py-4 rounded-3xl border border-white/20 backdrop-blur-md">
              {isSpinning ? "Girando..." : `¡LE TOCA A: ${currentSingers.join(" & ")}!`}
            </h2>

            <div className="relative w-[500px] h-[500px] mb-12">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 text-white drop-shadow-xl">
                <ChevronDown className="w-28 h-28" fill="currentColor" />
              </div>
              
              <motion.div
                className="w-full h-full rounded-full border-[12px] border-white/20 shadow-2xl overflow-hidden relative"
                animate={{ rotate: wheelRotation }}
                transition={{ duration: 5, ease: [0.1, 0.9, 0.2, 1] }}
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
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 pt-8 origin-bottom h-1/2">
                        <span className="font-black text-4xl text-white drop-shadow-lg">{player}</span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
              <div className="absolute inset-[180px] rounded-full bg-slate-950 border-[8px] border-white/20 z-10"></div>
            </div>
          </motion.div>
        )}

        {/* --- FASE 3: VOTACIÓN (TARJETAS CLARAS Y BORDES GRUESOS) --- */}
        {step === "VOTING" && (
           <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-6xl text-center">
            <h2 className="text-6xl font-black mb-12 text-white">¿Qué van a cantar?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {[1, 2].map((num) => {
                const song = SONGS[num - 1];
                const songVotes = num === 1 ? votes.song1 : votes.song2;
                
                return (
                  <div key={num} className="relative overflow-hidden bg-white/10 backdrop-blur-xl border-4 border-white/30 rounded-[3rem] p-12 text-left shadow-2xl">
                    <div className="relative z-10 flex flex-col h-full">
                      <h3 className="text-5xl font-black mb-4 text-white">{song.title}</h3>
                      <p className="text-3xl text-zinc-300 mb-16 font-bold">{song.artist}</p>
                      
                      <div className="mt-auto flex justify-between items-end bg-black/40 p-8 rounded-3xl border-2 border-white/10">
                        <span className="text-zinc-400 font-bold text-2xl uppercase tracking-widest">Votos</span>
                        <span className="text-8xl font-black text-indigo-400 leading-none">{songVotes}</span>
                      </div>
                    </div>
                    {/* Barra de progreso bien visible */}
                    <motion.div className="absolute bottom-0 left-0 h-4 bg-indigo-500" initial={{ width: 0 }} animate={{ width: `${(songVotes / 3) * 100}%` }} />
                  </div>
                );
              })}
            </div>
            <p className="mt-10 text-2xl text-zinc-500 font-medium">Esperando que voten desde los celulares...</p>
          </motion.div>
        )}

        {/* --- FASE 4: YOUTUBE --- */}
        {step === "PLAYING" && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 w-screen h-screen z-50 flex flex-col items-center justify-center bg-black p-6">
                <div className="w-full max-w-7xl h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-5xl font-black text-white">{currentSingers.join(" & ")}</h2>
                        <button onClick={() => setStep("RATING")} className="bg-white/10 hover:bg-white/20 border-2 border-white/20 px-8 py-3 rounded-full font-bold text-xl text-white transition-all">
                            Pasar al Jurado
                        </button>
                    </div>
                    <div className="flex-1 w-full rounded-[2rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-black relative">
                        <YouTube videoId={winnerSong.youtubeId} opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1 } }} className="absolute inset-0 w-full h-full" onEnd={() => setStep("RATING")}/>
                    </div>
                </div>
            </motion.div>
        )}

        {/* --- FASE 5: JURADO --- */}
        {step === "RATING" && (
             <motion.div key="rating" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl bg-white/10 backdrop-blur-xl border-4 border-white/20 p-16 rounded-[3rem] shadow-2xl text-center">
                <h2 className="text-6xl font-black mb-8 text-white">¡Momento de Votar!</h2>
                <p className="text-3xl text-zinc-300 mb-12">Pongan puntaje en sus celulares</p>
                
                <div className="bg-black/40 border-2 border-white/10 p-10 rounded-3xl mb-12">
                    <div className="flex gap-4 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-20 h-20 ${Math.round(ratings.count > 0 ? ratings.total / ratings.count : 0) >= star ? "text-yellow-400" : "text-white/10"}`} fill="currentColor" />
                      ))}
                    </div>
                    <p className="mt-8 text-zinc-400 font-bold text-2xl uppercase tracking-widest">{ratings.count} votos recibidos</p>
                </div>

                <button onClick={saveScoreAndContinue} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-2xl font-black text-4xl transition-colors">
                    Siguiente Ronda
                </button>
             </motion.div>
        )}

        {/* --- FASE 6: TABLA --- */}
        {step === "LEADERBOARD" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl text-center">
                 <div className="bg-white/10 backdrop-blur-md inline-flex items-center gap-6 px-12 py-6 rounded-full border-2 border-white/20 mb-12 shadow-xl">
                    <Trophy className="w-12 h-12 text-yellow-400" />
                    <h2 className="text-6xl font-black text-white">Ranking Final</h2>
                 </div>
                 
                 <div className="bg-white/5 backdrop-blur-xl rounded-[3rem] border-4 border-white/10 overflow-hidden mb-12 shadow-2xl">
                     <table className="w-full text-left">
                         <thead>
                             <tr className="bg-black/60 text-zinc-300 text-2xl uppercase tracking-widest">
                                 <th className="p-10 font-bold">Cantantes</th>
                                 <th className="p-10 text-center font-bold">Puntaje</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-white/10">
                             {[...leaderboard].sort((a,b) => b.total - a.total).map((entry, i) => (
                                 <tr key={i} className="hover:bg-white/5 transition-colors">
                                     <td className="p-10 font-bold text-4xl text-white">{entry.singers.join(" & ")}</td>
                                     <td className="p-10 text-center font-black text-6xl text-yellow-400 flex items-center justify-center gap-4">
                                         {entry.total} <Star className="w-10 h-10 text-yellow-400" fill="currentColor"/>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
                 <button onClick={startRoulette} className="bg-white text-black py-8 px-20 rounded-full font-black text-4xl shadow-2xl hover:bg-zinc-200 transition-colors">
                    Siguiente Turno
                 </button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}