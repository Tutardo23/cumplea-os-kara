"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic2, Tv, Smartphone } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");

  // Vos tocás acá desde la compu para la tele
  const createRoom = () => {
    const code = `KARA-${Math.floor(1000 + Math.random() * 9000)}`;
    router.push(`/${code}/screen`);
  };

  // Tus amigos tocan acá desde el celu
  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      // Los mandamos a la vista "/play" con el código en mayúsculas
      router.push(`/${roomCode.trim().toUpperCase()}/play`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 border border-white/20 mb-6 shadow-2xl">
            <Mic2 className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-2">Karaoke App</h1>
          <p className="text-zinc-400">¿Vas a ser el host o vas a jugar?</p>
        </div>

        <div className="space-y-8">
          {/* SECCIÓN JUGADORES (CELULAR) */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Smartphone className="w-6 h-6 text-pink-400" />
              <h2 className="text-2xl font-bold">Unirse a una Sala</h2>
            </div>
            <form onSubmit={joinRoom} className="flex flex-col gap-4">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Ej: KARA-1234"
                className="bg-black/50 border-2 border-white/10 p-4 rounded-xl text-xl outline-none focus:border-pink-500 transition-colors text-white uppercase text-center font-bold tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-zinc-600"
              />
              <button 
                type="submit"
                className="bg-pink-600 hover:bg-pink-500 text-white p-4 rounded-xl font-bold text-xl active:scale-95 transition-all shadow-lg shadow-pink-500/30"
              >
                Entrar a jugar
              </button>
            </form>
          </div>

          <div className="flex items-center gap-4 px-4">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-zinc-500 font-bold uppercase text-sm">O</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          {/* SECCIÓN HOST (PANTALLA GIGANTE) */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl shadow-xl text-center">
             <div className="flex items-center justify-center gap-3 mb-6">
              <Tv className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-bold">Crear una Sala</h2>
            </div>
            <p className="text-zinc-400 mb-6 text-sm">Creá una sala nueva para mostrar en la pantalla gigante y que los demás se unan.</p>
            <button 
              onClick={createRoom}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl font-bold text-xl active:scale-95 transition-all shadow-lg shadow-indigo-500/30"
            >
              Iniciar Host
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}