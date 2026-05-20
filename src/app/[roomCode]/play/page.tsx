"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Star, CheckCircle2, Loader2, Music, Mic2, Flame } from "lucide-react";

export default function MobileController() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [channel, setChannel] = useState<any>(null);
  
  const [currentStep, setCurrentStep] = useState<string>("LOBBY");
  const [hasVoted, setHasVoted] = useState(false);
  const [ratedCategories, setRatedCategories] = useState<string[]>([]);

  useEffect(() => {
    const roomChannel = supabase.channel(`room-${roomCode}`);
    
    roomChannel
      .on("broadcast", { event: "sync_step" }, (data) => {
        setCurrentStep(data.payload.step);
        if (data.payload.step === "VOTING") setHasVoted(false);
        if (data.payload.step === "RATING") setRatedCategories([]);
      })
      .subscribe();

    setChannel(roomChannel);
    return () => { supabase.removeChannel(roomChannel); };
  }, [roomCode]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    channel.send({ type: "broadcast", event: "new_player", payload: { name } });
    setJoined(true);
  };

  const sendVote = (songNum: 1 | 2) => {
    if (hasVoted) return;
    channel.send({ type: "broadcast", event: "vote", payload: { songNum, playerName: name } });
    setHasVoted(true);
  };

  const sendRating = (category: string, score: number) => {
    if (ratedCategories.includes(category)) return;
    channel.send({ type: "broadcast", event: "rate", payload: { category, score, playerName: name } });
    setRatedCategories(prev => [...prev, category]);
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex flex-col justify-center text-white">
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
            <h1 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Sala: {roomCode}</h1>
            <p className="text-zinc-400 mb-8 font-medium">Ingresá tu nombre para entrar al VIP</p>
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre real..."
                className="bg-black/50 border border-white/10 p-4 rounded-xl text-lg outline-none focus:border-indigo-500 transition-colors text-white"
            />
            <button type="submit" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl font-bold text-xl shadow-lg active:scale-95 transition-all">
                ¡Entrar a la Fiesta!
            </button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white flex flex-col items-center justify-center">
      {currentStep === "LOBBY" || currentStep === "ROULETTE" || currentStep === "PLAYING" || currentStep === "LEADERBOARD" ? (
        <div className="text-center flex flex-col items-center gap-6 bg-white/5 p-10 rounded-3xl border border-white/10">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <h2 className="text-xl font-bold text-zinc-300">Mirá la pantalla grande...</h2>
        </div>
      ) : null}

      {currentStep === "VOTING" && (
        <div className="w-full max-w-md space-y-6">
          <h2 className="text-4xl font-black mb-8 text-center text-white">¡Votá el tema!</h2>
          {!hasVoted ? (
            <div className="flex flex-col gap-4">
              <button onClick={() => sendVote(1)} className="w-full bg-indigo-600/20 border border-indigo-500 p-8 rounded-3xl text-2xl font-bold active:scale-95 transition-all text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                Opción 1
              </button>
              <button onClick={() => sendVote(2)} className="w-full bg-purple-600/20 border border-purple-500 p-8 rounded-3xl text-2xl font-bold active:scale-95 transition-all text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                Opción 2
              </button>
            </div>
          ) : (
            <div className="bg-green-900/20 border border-green-500/50 p-8 rounded-3xl text-center flex flex-col items-center gap-4">
              <CheckCircle2 className="w-16 h-16 text-green-400" />
              <p className="text-2xl font-bold text-white">¡Voto registrado!</p>
            </div>
          )}
        </div>
      )}

      {currentStep === "RATING" && (
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-3xl font-black mb-6 text-center text-yellow-400 drop-shadow-md">Puntuá el Show</h2>
          
          {[
            { key: "actitud", label: "Actitud en Escenario", icon: Flame },
            { key: "ganas", label: "Ganas / Pulmones", icon: Mic2 },
            { key: "voz", label: "Afinación / Voz", icon: Music }
          ].map((cat) => {
            const Icon = cat.icon;
            const isRated = ratedCategories.includes(cat.key);
            
            return (
              <div key={cat.key} className="bg-white/5 border border-white/10 p-5 rounded-3xl relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4 justify-center text-zinc-300">
                  <Icon className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase tracking-widest">{cat.label}</span>
                </div>
                
                {!isRated ? (
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        onClick={() => sendRating(cat.key, star)} 
                        className="p-3 bg-black/40 rounded-full active:bg-yellow-500/30 transition-colors border border-white/5"
                      >
                        <Star className="w-8 h-8 text-yellow-500" fill="currentColor" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-green-400 py-2">
                    <CheckCircle2 className="w-8 h-8 mb-1" />
                    <span className="font-bold text-sm uppercase">Enviado</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}