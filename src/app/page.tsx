"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic2, Smartphone, Tv, Zap } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");

  const createRoom = () => {
    const code = `MACHI-${Math.floor(1000 + Math.random() * 9000)}`;
    router.push(`/${code}/screen`);
  };

  const joinRoom = (event: React.FormEvent) => {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code) router.push(`/${code}/play`);
  };

  return (
    <main className="party-bg party-grid relative min-h-screen overflow-hidden px-5 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-[14%] h-16 -rotate-2 bg-[var(--boca-yellow)] opacity-90" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <section>
            <div className="mb-7 inline-flex items-center gap-3 border border-[var(--boca-yellow)]/35 bg-[var(--boca-yellow)]/8 px-4 py-2 text-xs font-black uppercase tracking-[.22em] text-[var(--boca-yellow)]">
              <Zap className="h-4 w-4" /> Birthday control system
            </div>
            <h1 className="font-display max-w-3xl text-[clamp(4.3rem,11vw,9.5rem)] font-black uppercase leading-[.78] tracking-[-.035em] text-white">
              Machi&apos;s <span className="text-[var(--boca-yellow)]">Night</span>
            </h1>
            <p className="mt-7 max-w-xl text-base font-medium leading-7 text-white/62 sm:text-lg">Karaoke, minijuegos y controles móviles en tiempo real. La pantalla dirige el show; cada teléfono participa.</p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[.14em] text-white/58">
              <span className="border border-white/12 bg-white/5 px-4 py-2">Sin cuentas</span>
              <span className="border border-white/12 bg-white/5 px-4 py-2">Entrada por QR</span>
              <span className="border border-white/12 bg-white/5 px-4 py-2">Tiempo real</span>
            </div>
          </section>

          <section className="screen-card border-t-4 border-t-[var(--boca-yellow)] p-5 sm:p-7">
            <div className="mb-7 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center bg-[var(--boca-yellow)] text-[var(--boca-blue)]"><Mic2 className="h-6 w-6" /></div>
              <div>
                <p className="eyebrow">Entrar rápido</p>
                <h2 className="font-display text-3xl font-black uppercase">Elegí tu lado</h2>
              </div>
            </div>

            <form onSubmit={joinRoom} className="border border-white/10 bg-black/15 p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[.12em]"><Smartphone className="h-5 w-5 text-[var(--boca-yellow)]" /> Invitado</div>
              <input className="field text-center text-lg font-black uppercase tracking-[.18em]" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="MACHI-1234" />
              <button className="primary-button mt-3 w-full justify-center" type="submit">Entrar a jugar</button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.22em] text-white/30"><span className="h-px flex-1 bg-white/10" /> Host <span className="h-px flex-1 bg-white/10" /></div>

            <button type="button" onClick={createRoom} className="secondary-button w-full justify-center"><Tv className="h-5 w-5 text-[var(--boca-yellow)]" /> Crear pantalla principal</button>
          </section>
        </div>
      </div>
    </main>
  );
}
