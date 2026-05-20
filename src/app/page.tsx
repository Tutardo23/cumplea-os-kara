"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic2, Tv, Smartphone } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");

  const createRoom = () => {
    const code = `KARA-${Math.floor(1000 + Math.random() * 9000)}`;
    router.push(`/${code}/screen`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      router.push(`/${roomCode.trim().toUpperCase()}/play`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white p-4 font-sans selection:bg-indigo-500/30">
      <div className="absolute inset-0 z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-2xl shadow-indigo-500/20">
            <Mic2 className="w-10 h-10 text-indigo-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            Karaoke VIP
          </h1>
          <p className="text-zinc-400 font-medium">¿Vas a crear la sala o vas a jugar?</p>
        </div>

        <div className="space-y-6">
          {/* SECCIÓN JUGADORES */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Smartphone className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold">Unirse a una Sala</h2>
            </div>
            <form onSubmit={joinRoom} className="flex flex-col gap-4">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Ej: KARA-1234"
                className="bg-black/40 border border-white/10 p-4 rounded-xl text-xl outline-none focus:border-purple-500 transition-colors text-white uppercase text-center font-bold tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-zinc-600"
              />
              <button 
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-xl font-bold text-xl active:scale-95 transition-all shadow-lg shadow-purple-500/30"
              >
                Entrar a jugar
              </button>
            </form>
          </div>

          <div className="flex items-center gap-4 px-4">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Opción Host</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          {/* SECCIÓN HOST */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-xl text-center">
             <div className="flex items-center justify-center gap-3 mb-4">
              <Tv className="w-6 h-6 text-indigo-400" />
              <h2 className="text-xl font-bold">Pantalla Gigante</h2>
            </div>
            <p className="text-zinc-400 mb-6 text-sm">Creá la sala principal para mostrar en el televisor.</p>
            <button 
              onClick={createRoom}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white p-4 rounded-xl font-bold text-lg active:scale-95 transition-all"
            >
              Iniciar Host
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}