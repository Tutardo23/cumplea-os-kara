"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PlayerAvatar } from "./PlayerAvatar";
import type { Player } from "@/types/game";

export function SpotlightDraw({
  players,
  selected,
  endsAt,
  surpriseSong = false,
}: {
  players: Player[];
  selected: string[];
  endsAt?: number;
  surpriseSong?: boolean;
}) {
  const [cursor, setCursor] = useState(0);
  const [reveal, setReveal] = useState(false);
  const pool = useMemo(() => players.length ? players : [{ name: "Machi's Night", avatar: "star" as const }], [players]);

  useEffect(() => {
    setReveal(false);
    const interval = window.setInterval(() => {
      const remaining = (endsAt ?? Date.now()) - Date.now();
      if (remaining <= 1000) {
        setReveal(true);
        window.clearInterval(interval);
        return;
      }
      setCursor((value) => (value + 1 + Math.floor(Math.random() * Math.max(1, pool.length - 1))) % pool.length);
    }, 115);
    return () => window.clearInterval(interval);
  }, [endsAt, pool.length]);

  const visible = reveal
    ? selected.map((name) => pool.find((player) => player.name === name) ?? { name, avatar: "star" as const })
    : [pool[cursor % pool.length]];

  return (
    <div className="mx-auto max-w-5xl text-center">
      <p className="eyebrow">{surpriseSong ? "Spotlight + tema sorpresa" : "Spotlight"}</p>
      <h2 className="font-display text-[clamp(4rem,10vw,9rem)] font-black uppercase leading-[.82]">
        {reveal ? "Entra al" : "Buscando"} <span className="text-[var(--boca-yellow)]">escenario</span>
      </h2>

      <div className="my-10 flex min-h-[250px] flex-wrap items-center justify-center gap-5">
        {visible.map((player) => (
          <motion.div
            key={`${player.name}-${reveal ? "reveal" : cursor}`}
            initial={{ y: 18, opacity: 0, scale: .96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: reveal ? .28 : .08 }}
            className={`screen-card min-w-[270px] px-8 py-8 ${reveal ? "border-2 border-[var(--boca-yellow)] shadow-[0_0_70px_rgba(255,209,0,.13)]" : "border border-white/12"}`}
          >
            <div className="mx-auto w-fit"><PlayerAvatar avatar={player.avatar} size="lg" active={reveal} /></div>
            <p className="font-display mt-5 text-5xl font-black uppercase">{player.name}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
