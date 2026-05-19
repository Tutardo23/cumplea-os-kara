"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Star } from "lucide-react";

export default function MobileController() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    // Nos conectamos al canal específico de esta sala
    const roomChannel = supabase.channel(`room-${roomCode}`);
    roomChannel.subscribe();
    setChannel(roomChannel);

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomCode]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Le avisamos a la pantalla que entramos
    channel.send({
      type: "broadcast",
      event: "new_player",
      payload: { name },
    });
    setJoined(true);
  };

  const sendVote = (songNum: 1 | 2) => {
    channel.send({
      type: "broadcast",
      event: "vote_song",
      payload: { songNum },
    });
  };

  const sendRating = (category: string, score: number) => {
    channel.send({
      type: "broadcast",
      event: "rate_singer",
      payload: { category, score },
    });
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex flex-col justify-center text-white">
        <h1 className="text-3xl font-bold mb-2">Sala: {roomCode}</h1>
        <p className="text-zinc-400 mb-8">Ingresá tu nombre para jugar</p>
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre..."
            className="bg-white/10 border border-white/20 p-4 rounded-xl text-lg outline-none focus:border-indigo-500"
          />
          <button type="submit" className="bg-indigo-600 p-4 rounded-xl font-bold text-lg">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-8 text-indigo-400">Control Remoto</h2>
      
      {/* Botones de Votación */}
      <div className="w-full space-y-4 mb-12">
        <h3 className="text-center font-bold text-zinc-400">Votar Canción</h3>
        <button onClick={() => sendVote(1)} className="w-full bg-white/10 border border-white/20 p-6 rounded-2xl text-xl font-bold active:scale-95 transition-transform">Votar Opción 1</button>
        <button onClick={() => sendVote(2)} className="w-full bg-white/10 border border-white/20 p-6 rounded-2xl text-xl font-bold active:scale-95 transition-transform">Votar Opción 2</button>
      </div>

      {/* Botones de Puntaje Rápido */}
      <div className="w-full space-y-4">
        <h3 className="text-center font-bold text-zinc-400">Dar Puntaje al Show</h3>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button 
              key={star} 
              onClick={() => sendRating("actitud", star)} // Cambiar categoría según necesites
              className="p-3 bg-white/5 rounded-full active:bg-yellow-500/20"
            >
              <Star className="w-8 h-8 text-yellow-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}