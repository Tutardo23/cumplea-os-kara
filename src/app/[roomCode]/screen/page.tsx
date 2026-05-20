"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic2, Play, Trophy, ChevronDown, Star } from "lucide-react";
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
  { id: 1, name: "RONDA 1 (SOLOS)", type: 1, totalTurns: 4 },
  { id: 2, name: "RONDA 2 (DÚOS)", type: 2, totalTurns: 3 },
];

const WHEEL_COLORS = ["#ffffff", "#dc2626"]; 

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
  const channelRef = useRef<any>(null);

  // 1. Conexión única a Supabase Broadcast
  useEffect(() => {
    if (!roomCode) return;
    
    const channel = supabase.channel(`room-${roomCode}`);
    channelRef.current = channel;
    
    channel
      .on("broadcast", { event: "new_player" }, (data) => {
        setPlayers((prev) => !prev.includes(data.payload.name) ? [...prev, data.payload.name] : prev);
      })
      .on("broadcast", { event: "vote" }, (data) => {
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: "broadcast", event: "sync_step", payload: { step } });
        }
      });

    return () => { 
      supabase.removeChannel(channel); 
      channelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // 2. Sincronizar pantallas de los celulares sin recrear canales
  useEffect(() => {
    if (channelRef.current && step) {
      try {
        channelRef.current.send({ type: "broadcast", event: "sync_step", payload: { step } });
      } catch (e) {
        console.error(e);
      }
    }
  }, [step]);

  // 3. VIGILANTE DE VOTOS DINÁMICO (Más de la mitad de la sala pasa de pantalla)
  useEffect(() => {
    const totalVotes = votes.song1 + votes.song2;
    // La mitad de los jugadores redondeado hacia abajo + 1 (ej: 3 jugadores => necesita 2 votos)
    const requiredVotes = Math.floor(players.length / 2) + 1;

    if (step === "VOTING" && totalVotes >= requiredVotes) {
      setWinnerSong(votes.song1 > votes.song2 ? SONGS[0] : SONGS[1]);
      setTimeout(() => setStep("PLAYING"), 1000);
    }
  }, [votes, step, players.length]);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayer.trim() && !players.includes(newPlayer)) {
      setPlayers((prev) => [...prev, newPlayer]);
      setNewPlayer("");
    }
  };

  const startRoulette = () => {
    if (players.length < 3) return alert("Mínimo 3 personas.");
    setStep("ROULETTE");
    setIsSpinning(true);
    setRatings({ total: 0, count: 0 });
    setVotes({ song1: 0, song2: 0 });

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
    if (ratings.count === 0) return alert("Nadie votó.");
    const average = Math.round(ratings.total / ratings.count);
    
    setLeaderboard([...leaderboard, { singers: currentSingers, total: average }]);
    
    if (currentTurn < currentRound.totalTurns) {
      setCurrentTurn(currentTurn + 1);
    } else if (currentRoundIdx < TOURNAMENT_ROUNDS.length - 1) {
      setCurrentRoundIdx(currentRoundIdx + 1);
      setCurrentTurn(1);
    }
    setStep("LEADERBOARD");
  };

  const requiredVotes = Math.floor(players.length / 2) + 1;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 font-sans">
      <AnimatePresence mode="wait">
        
        {/* --- FASE 1: LOBBY --- */}
        {step === "LOBBY" && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-3xl text-center">
            <h1 className="text-7xl font-bold mb-4 uppercase text-white">
              KARAOKE <span className="text-red-600">NIGHT</span>
            </h1>
            <div className="border-4 border-white inline-block px-8 py-2 mb-12">
                <span className="text-2xl font-bold uppercase tracking-widest text-white">SALA: {roomCode}</span>
            </div>

            <form onSubmit={handleAddPlayer} className="flex gap-4 mb-8">
              <input
                type="text"
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                placeholder="Nombre..."
                className="flex-1 bg-zinc-900 border-2 border-zinc-700 px-6 py-4 text-xl outline-none focus:border-red-600 text-white font-bold"
              />
              <button type="submit" className="bg-white text-black px-8 font-bold text-2xl uppercase hover:bg-zinc-300 border-2 border-white">AÑADIR</button>
            </form>
              
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <AnimatePresence>
                {players.map((p, i) => (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} key={i} className="border-2 border-white px-6 py-2 flex items-center gap-3 bg-zinc-900">
                    <Mic2 className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-xl uppercase">{p}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {players.length >= 3 && (
              <button onClick={startRoulette} className="w-full bg-red-600 text-white py-6 font-bold text-3xl uppercase tracking-widest border-4 border-red-500 hover:bg-red-700 transition-colors">
                EMPEZAR
              </button>
            )}
          </motion.div>
        )}

        {/* --- FASE 2: RULETA --- */}
        {step === "ROULETTE" && (
          <motion.div key="roulette" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center w-full max-w-xl flex flex-col items-center">
            <h2 className="text-4xl font-bold mb-10 uppercase text-white border-4 border-white px-8 py-4 bg-zinc-900">
              {isSpinning ? "GIRANDO..." : `ELEGIDO: ${currentSingers.join(" & ")}`}
            </h2>

            <div className="relative w-[450px] h-[450px] mb-12">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 text-white">
                <ChevronDown className="w-24 h-24" fill="currentColor" />
              </div>
              
              <motion.div
                className="w-full h-full rounded-full border-[10px] border-white overflow-hidden relative shadow-2xl"
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
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 pt-6 origin-bottom h-1/2">
                        <span className={`font-black text-3xl uppercase ${i % 2 === 0 ? 'text-black' : 'text-white'}`}>{player}</span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
              <div className="absolute inset-[170px] rounded-full bg-black border-[8px] border-white z-10"></div>
            </div>
          </motion.div>
        )}

        {/* --- FASE 3: VOTACIÓN --- */}
        {step === "VOTING" && (
           <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-5xl text-center">
            <h2 className="text-6xl font-bold mb-2 text-white uppercase">VOTACIÓN</h2>
            <p className="text-xl text-zinc-500 font-bold uppercase tracking-widest mb-10">Se necesitan {requiredVotes} votos para pasar (Mitad + 1)</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2].map((num) => {
                const song = SONGS[num - 1];
                const songVotes = num === 1 ? votes.song1 : votes.song2;
                
                return (
                  <div key={num} className={`relative overflow-hidden border-4 ${num === 1 ? 'border-white' : 'border-red-600'} p-10 text-left bg-zinc-900 shadow-2xl`}>
                    <div className="relative z-10 flex flex-col h-full">
                      <h3 className="text-4xl font-bold mb-2 text-white uppercase">{song.title}</h3>
                      <p className="text-2xl text-zinc-400 mb-12 font-bold uppercase">{song.artist}</p>
                      <div className="mt-auto flex justify-between items-end border-t-2 border-zinc-700 pt-6">
                        <span className="text-zinc-500 font-bold text-xl uppercase">VOTOS</span>
                        <span className={`text-8xl font-bold leading-none ${num === 1 ? 'text-white' : 'text-red-600'}`}>{songVotes}</span>
                      </div>
                    </div>
                    {/* El progreso se calcula en base al número requerido de votos */}
                    <motion.div className={`absolute bottom-0 left-0 h-3 ${num === 1 ? 'bg-white' : 'bg-red-600'}`} initial={{ width: 0 }} animate={{ width: `${(songVotes / requiredVotes) * 100}%` }} />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* --- FASE 4: YOUTUBE --- */}
        {step === "PLAYING" && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 w-screen h-screen z-50 flex flex-col items-center justify-center bg-black p-4">
                <div className="w-full max-w-7xl">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-4xl font-bold text-white uppercase">{currentSingers.join(" & ")}</h2>
                        <button onClick={() => setStep("RATING")} className="border-4 border-white bg-black px-8 py-2 font-bold text-xl text-white uppercase hover:bg-white hover:text-black transition-colors">
                            TERMINAR
                        </button>
                    </div>
                    <div className="aspect-video w-full border-4 border-red-600 bg-black relative shadow-2xl">
                        <YouTube videoId={winnerSong.youtubeId} opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1 } }} className="absolute inset-0 w-full h-full" onEnd={() => setStep("RATING")}/>
                    </div>
                </div>
            </motion.div>
        )}

        {/* --- FASE 5: JURADO --- */}
        {step === "RATING" && (
             <motion.div key="rating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-xl border-4 border-red-600 p-12 bg-black text-center shadow-2xl">
                <h2 className="text-6xl font-bold mb-10 text-white uppercase">JURADO</h2>
                
                <div className="border-2 border-zinc-800 p-8 mb-10 bg-zinc-900">
                    <div className="flex gap-4 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-16 h-16 ${Math.round(ratings.count > 0 ? ratings.total / ratings.count : 0) >= star ? "text-red-600" : "text-zinc-800"}`} fill="currentColor" />
                      ))}
                    </div>
                    <p className="mt-6 text-zinc-400 uppercase font-bold text-xl">{ratings.count} VOTOS ENVIADOS</p>
                </div>

                <button onClick={saveScoreAndContinue} className="w-full bg-white text-black py-6 font-bold text-3xl uppercase border-2 border-white hover:bg-zinc-300 transition-colors">
                    CONTINUAR
                </button>
             </motion.div>
        )}

        {/* --- FASE 6: TABLA --- */}
        {step === "LEADERBOARD" && (
            <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl text-center">
                 <h2 className="text-6xl font-bold text-white mb-10 uppercase border-b-4 border-red-600 pb-4 inline-block">RANKING</h2>
                 
                 <div className="border-4 border-white mb-10 shadow-2xl">
                     <table className="w-full text-left">
                         <thead>
                             <tr className="bg-red-600 text-white text-2xl uppercase border-b-4 border-white">
                                 <th className="p-8 font-black">CANTANTES</th>
                                 <th className="p-8 text-center font-black">PUNTAJE</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y-2 divide-white bg-zinc-900">
                             {[...leaderboard].sort((a,b) => b.total - a.total).map((entry, i) => (
                                 <tr key={i} className="hover:bg-black/30 transition-colors">
                                     <td className="p-8 font-bold text-3xl text-white uppercase border-r-2 border-white">{entry.singers.join(" & ")}</td>
                                     <td className="p-8 text-center font-black text-5xl text-white flex items-center justify-center gap-4">
                                         {entry.total} <Star className="w-10 h-10 text-red-600" fill="currentColor"/>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
                 <button onClick={startRoulette} className="bg-white text-black py-6 px-16 font-bold text-3xl uppercase border-2 border-white hover:bg-zinc-300 transition-colors">
                    SIGUIENTE
                 </button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}