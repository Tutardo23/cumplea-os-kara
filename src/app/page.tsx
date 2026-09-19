"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Hash, MonitorUp, Radio, Smartphone, Users } from "lucide-react";
import { motion } from "framer-motion";

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
    <main className="relative min-h-screen overflow-hidden bg-[#05080f] text-white party-noise">
      <div className="party-grid absolute inset-0 opacity-70" />
      <div className="absolute -left-24 top-8 h-80 w-80 rounded-full bg-[#0a53be]/25 blur-[120px]" />
      <div className="absolute -right-20 bottom-[-80px] h-96 w-96 rounded-full bg-[#f7c600]/10 blur-[120px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center border border-[#f7c600]/40 bg-[#003b7a] text-[#f7c600]">
              <Radio className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#f7c600]">Live party system</p>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-white/70">Machi&apos;s Night</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/45 sm:flex">
            <Users className="h-4 w-4 text-[#f7c600]" />
            Teléfonos como controles
          </div>
        </header>

        <section className="grid items-center gap-12 py-14 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 inline-flex items-center gap-2 border border-[#f7c600]/35 bg-[#f7c600]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-[#ffd84d]">
              <span className="h-2 w-2 bg-[#f7c600]" />
              Una noche. Una sala. Todos jugando.
            </div>

            <h1 className="max-w-4xl text-[clamp(4rem,12vw,9rem)] font-black uppercase leading-[0.78] tracking-[-0.075em]">
              Machi&apos;s
              <span className="block text-[#f7c600]">Night</span>
            </h1>

            <p className="mt-8 max-w-xl text-base font-medium leading-7 text-white/58 sm:text-lg">
              La pantalla grande maneja el show. Cada invitado entra desde el celular y participa en tiempo real:
              vota, reacciona, compite y cambia lo que pasa en la fiesta.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
              <span className="border border-white/10 bg-white/[0.035] px-4 py-3">Ritmo rápido</span>
              <span className="border border-white/10 bg-white/[0.035] px-4 py-3">Sin instalar apps</span>
              <span className="border border-white/10 bg-white/[0.035] px-4 py-3">Tiempo real</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="party-panel overflow-hidden rounded-[2rem]"
          >
            <div className="border-b border-[#f7c600]/20 bg-[#003b7a]/70 px-6 py-5 sm:px-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#f7c600]">Entrar a la fiesta</p>
                  <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">Usá tu celular</h2>
                </div>
                <Smartphone className="h-7 w-7 text-[#f7c600]" />
              </div>
            </div>

            <form onSubmit={joinRoom} className="space-y-4 p-6 sm:p-8">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
                  <Hash className="h-4 w-4 text-[#f7c600]" />
                  Código de sala
                </span>
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value)}
                  placeholder="MACHI-1234"
                  autoCapitalize="characters"
                  className="w-full border border-white/12 bg-black/30 px-5 py-4 text-center text-xl font-black uppercase tracking-[0.2em] text-white outline-none transition focus:border-[#f7c600]"
                />
              </label>

              <button
                type="submit"
                className="group flex w-full items-center justify-between bg-[#f7c600] px-5 py-4 text-left text-sm font-black uppercase tracking-[0.14em] text-[#001a3d] transition active:scale-[0.99]"
              >
                Entrar como jugador
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            <div className="border-t border-white/8 p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <MonitorUp className="h-5 w-5 text-[#f7c600]" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">Pantalla principal</p>
                  <p className="text-sm font-bold text-white/80">Para TV, monitor o proyector</p>
                </div>
              </div>
              <button
                onClick={createRoom}
                className="flex w-full items-center justify-between border border-[#f7c600]/45 bg-[#003b7a]/70 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#003b7a]"
              >
                Crear sala
                <ArrowRight className="h-5 w-5 text-[#f7c600]" />
              </button>
            </div>
          </motion.div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/8 pt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <span>Machi&apos;s Night</span>
          <span>Azul y oro. Hecho para jugar rápido.</span>
        </footer>
      </div>
    </main>
  );
}
