import { Flame, Hand, Laugh, Zap } from "lucide-react";
import type { ReactionKind } from "@/lib/party";

type Props = {
  kind: ReactionKind;
  className?: string;
  strokeWidth?: number;
};

export function ReactionIcon({ kind, className = "h-6 w-6", strokeWidth = 2.4 }: Props) {
  const common = { className, strokeWidth };

  if (kind === "fire") return <Flame {...common} />;
  if (kind === "clap") return <Hand {...common} />;
  if (kind === "laugh") return <Laugh {...common} />;
  return <Zap {...common} />;
}
