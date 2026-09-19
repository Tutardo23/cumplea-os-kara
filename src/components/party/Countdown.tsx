"use client";

import { useEffect, useState } from "react";

export function Countdown({ endsAt }: { endsAt?: number }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil(((endsAt ?? Date.now()) - Date.now()) / 1000)));

  useEffect(() => {
    if (!endsAt) return;
    const update = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    update();
    const id = window.setInterval(update, 150);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;
  return <span className="font-display tabular-nums text-[clamp(2rem,5vw,5rem)] leading-none">{left}</span>;
}
