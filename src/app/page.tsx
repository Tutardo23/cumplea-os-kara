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
    <div className="min-h-screen bg-black flex items-center justify-center text-white p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <Mic2 className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-6xl font-bold tracking-tight mb-2 uppercase">
            Karaoke <span className="text-red-600">Night</span>
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest">¿Host o Jugador?</p>
        </div>

        <div className="space-y-8">
          {/* SECCIÓN JUGADORES (CELULAR) */}
          <div className="border-4 border-red-600 p-8 bg-zinc-900">
            <div className="flex items-center justify-center gap-3 mb-6 text-red-600">
              <Smartphone className="w-8 h-8" />
              <h2 className="text-3xl font-bold uppercase">Unirse a Sala</h2>
            </div>
            <form onSubmit={joinRoom} className="flex flex-col gap-4">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="EJ: KARA-1234"
                className="bg-black border-2 border-zinc-700 p-4 text-2xl outline-none focus:border-red-600 text-white uppercase text-center font-bold tracking-widest placeholder:text-zinc-700 transition-colors"
              />
              <button 
                type="submit"
                className="bg-red-600 text-white p-4 font-bold text-2xl uppercase hover:bg-red-700 transition-colors"
              >
                Entrar a Jugar
              </button>
            </form>
          </div>

          {/* SEPARADOR */}
          <div className="flex items-center gap-4 px-4">
            <div className="h-1 bg-zinc-800 flex-1"></div>
            <span className="text-zinc-600 font-bold uppercase text-xl">O</span>
            <div className="h-1 bg-zinc-800 flex-1"></div>
          </div>

          {/* SECCIÓN HOST (PANTALLA GIGANTE) */}
          <div className="border-4 border-white p-8 bg-black text-center">
             <div className="flex items-center justify-center gap-3 mb-6 text-white">
              <Tv className="w-8 h-8" />
              <h2 className="text-3xl font-bold uppercase">Crear Sala</h2>
            </div>
            <p className="text-zinc-500 mb-6 font-bold uppercase text-sm tracking-widest">Inicia la pantalla gigante</p>
            <button 
              onClick={createRoom}
              className="w-full bg-white text-black p-4 font-bold text-2xl uppercase hover:bg-zinc-300 transition-colors"
            >
              Iniciar Host
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}