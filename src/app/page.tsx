"use client";

import { useRouter } from "next/navigation";
import { Mic2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const createRoom = () => {
    // Genera un código tipo "KARA-4829"
    const code = `KARA-${Math.floor(1000 + Math.random() * 9000)}`;
    router.push(`/${code}/screen`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
      <div className="text-center">
        <Mic2 className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
        <h1 className="text-5xl font-bold mb-8">Karaoke System</h1>
        <button 
          onClick={createRoom}
          className="bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-xl font-bold text-xl transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)]"
        >
          Crear Sala Nueva
        </button>
      </div>
    </div>
  );
}