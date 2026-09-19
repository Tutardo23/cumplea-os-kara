"use client";

import {
  Bolt,
  Crown,
  Disc3,
  Gamepad2,
  Guitar,
  Headphones,
  Radio,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { AvatarKey } from "@/types/game";

const ICONS: Record<AvatarKey, LucideIcon> = {
  star: Star,
  guitar: Guitar,
  headphones: Headphones,
  disc: Disc3,
  gamepad: Gamepad2,
  radio: Radio,
  crown: Crown,
  bolt: Bolt,
};

export function PlayerAvatar({
  avatar,
  size = "md",
  active = false,
}: {
  avatar: AvatarKey;
  size?: "sm" | "md" | "lg";
  active?: boolean;
}) {
  const Icon = ICONS[avatar];
  const sizes = {
    sm: "h-9 w-9",
    md: "h-12 w-12",
    lg: "h-20 w-20",
  };
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-10 w-10",
  };

  return (
    <div
      className={`${sizes[size]} grid place-items-center rounded-full border-2 ${
        active
          ? "border-[var(--boca-yellow)] bg-[var(--boca-yellow)] text-[var(--boca-blue)] shadow-[0_0_28px_rgba(255,209,0,.3)]"
          : "border-white/15 bg-white/8 text-white"
      }`}
    >
      <Icon className={iconSizes[size]} strokeWidth={2.2} />
    </div>
  );
}
