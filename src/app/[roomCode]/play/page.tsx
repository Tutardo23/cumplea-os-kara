"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Star, CheckCircle2, Loader2 } from "lucide-react";

export default function MobileController() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [channel, setChannel] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [currentStep, setCurrentStep] = useState<string>("LOBBY");
  const [hasVoted, setHasVoted] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    const roomChannel = supabase.channel(`room-${roomCode}`);
    
    roomChannel
      .on("broadcast", { event: "sync_step" }, (data) => {
        setCurrentStep(data.payload.step);
        if (data.payload.step === "VOTING") setHasVoted(false);
        if (data.payload.step === "RATING") setHasRated(false);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsConnected(true);
      });

    setChannel(roomChannel);
    return () => { supabase.removeChannel(roomChannel); };
  }, [roomCode]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isConnected) return;
    channel.send({ type: "broadcast", event: "new_player", payload: { name } });
    setJoined(true);
  };

  const sendVote = (songNum: 1 | 2) => {
    if (hasVoted) return;
    channel.send({ type: "broadcast", event: "vote", payload: { songNum } });
    setHasVoted(true);
  };

  const sendRating = (score: number) => {
    if (hasRated) return;
    channel.send({ type: "broadcast", event: "rate", payload: { score } });
    setHasRated(true);
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col justify-center text-white">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
          <h1 className="text-4xl font-black mb-2">Sala: <span className="text-indigo-400">{roomCode}</span></h1>
          <p className="text-zinc-400 mb-8 font-medium">
            {isConnected ? "Conexión lista." : "Conectando..."}
          </p>
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre..."
              className="bg-black/50 border-2 border-white/10 p-4 rounded-xl text-xl outline-none focus:border-indigo-500 transition-colors text-white"
            />
            <button 
              type="submit" 
              disabled={!isConnected}
              className="bg-indigo-600 text-white p-4 rounded-xl font-bold text-xl active:scale-95 transition-transform disabled:opacity-50"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white flex flex-col items-center justify-center">
      {currentStep === "LOBBY" || currentStep === "ROULETTE" || currentStep === "PLAYING" || currentStep === "LEADERBOARD" ? (
        <div className="text-center flex flex-col items-center gap-4 bg-white/5 p-8 rounded-3xl border border-white/10">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <h2 className="text-xl font-bold text-zinc-300">Mirá la pantalla grande...</h2>
        </div>
      ) : null}

      {currentStep === "VOTING" && (
        <div className="w-full max-w-sm space-y-6">
          <h2 className="text-3xl font-black mb-6 text-center">Votar Canción</h2>
          {!hasVoted ? (
            <div className="flex flex-col gap-4">
              <button onClick={() => sendVote(1)} className="w-full bg-indigo-600 border-2 border-indigo-400 p-8 rounded-2xl text-2xl font-bold active:scale-95 transition-transform shadow-lg shadow-indigo-500/30">
                Opción 1
              </button>
              <button onClick={() => sendVote(2)} className="w-full bg-pink-600 border-2 border-pink-400 p-8 rounded-2xl text-2xl font-bold active:scale-95 transition-transform shadow-lg shadow-pink-500/30">
                Opción 2
              </button>
            </div>
          ) : (
            <div className="bg-white/10 border-2 border-green-500 p-8 rounded-2xl text-center flex flex-col items-center gap-4">
              <CheckCircle2 className="w-16 h-16 text-green-400" />
              <p className="text-2xl font-bold">Voto enviado</p>
            </div>
          )}
        </div>
      )}

      {currentStep === "RATING" && (
        <div className="w-full max-w-sm space-y-6">
          <h2 className="text-3xl font-black mb-6 text-center text-yellow-400">Puntuar Show</h2>
          {!hasRated ? (
            <div className="bg-white/10 border-2 border-white/20 p-6 rounded-2xl shadow-xl">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => sendRating(star)} className="p-3 bg-black/40 rounded-full active:bg-yellow-500/30 border border-white/10">
                    <Star className="w-10 h-10 text-yellow-400" fill="currentColor" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
             <div className="bg-white/10 border-2 border-green-500 p-8 rounded-2xl text-center flex flex-col items-center gap-4">
              <CheckCircle2 className="w-16 h-16 text-green-400" />
              <p className="text-2xl font-bold">Puntaje enviado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}