import { getInitials } from "@/lib/party";

type Props = {
  name: string;
  online?: boolean;
  compact?: boolean;
};

export function PlayerBadge({ name, online = true, compact = false }: Props) {
  return (
    <div className={`flex items-center gap-3 border border-white/10 bg-white/[0.045] ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <div className={`grid shrink-0 place-items-center bg-[#f7c600] font-black text-[#001a3d] ${compact ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-xs"}`}>
        {getInitials(name)}
      </div>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-black uppercase tracking-[0.08em] text-white">{name}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-white/20"}`} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
            {online ? "online" : "offline"}
          </span>
        </div>
      </div>
    </div>
  );
}
