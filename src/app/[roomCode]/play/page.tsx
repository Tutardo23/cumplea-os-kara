"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Star, CheckCircle2, Loader2, Music, Mic2, Flame, Wifi, WifiOff, LogOut } from "lucide-react";

// Nombres base para generar los robots aleatorios
const AVATAR_SEEDS = ["Felix", "Aneka", "Jude", "Loki", "Mimi", "Buster", "Salem", "Mittens", "Jasper", "Bandit", "Gizmo", "Simon"];
const normalizePlayerName = (value: string) => value.trim().replace(/\s+/g, " ");
type SongOption = { id: string; title: string; artist: string; youtubeId?: string };
type RemoteState = { step?: string; votingKey?: string; ratingKey?: string; currentOptions?: SongOption[]; currentSingers?: string[] };
type SavedPlayerSession = { savedName?: string; savedAvatar?: string };

export default function MobileController() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const savedSession = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(`karaoke_vip_${roomCode}`);
      return raw ? JSON.parse(raw) as SavedPlayerSession : null;
    } catch {
      return null;
    }
  })();
  
  const [name, setName] = useState(savedSession?.savedName ? normalizePlayerName(savedSession.savedName) : "");
  const [avatar, setAvatar] = useState(savedSession?.savedAvatar || AVATAR_SEEDS[0]);
  const [joined, setJoined] = useState(Boolean(savedSession?.savedName));
  const [isConnected, setIsConnected] = useState(false);
  
  const [currentStep, setCurrentStep] = useState<string>("LOBBY");
  const [hasVoted, setHasVoted] = useState(false);
  const [ratedCategories, setRatedCategories] = useState<string[]>([]);
  const [votingKey, setVotingKey] = useState("");
  const [ratingKey, setRatingKey] = useState("");
  const [currentOptions, setCurrentOptions] = useState<SongOption[]>([]);
  const [currentSingers, setCurrentSingers] = useState<string[]>([]);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const nameRef = useRef("");

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  const voteStorageKey = (key: string, playerName = nameRef.current) => `karaoke_vote_${roomCode}_${key}_${playerName.toLowerCase()}`;
  const ratingStorageKey = (key: string, category: string, playerName = nameRef.current) => `karaoke_rating_${roomCode}_${key}_${playerName.toLowerCase()}_${category}`;

  const applyRemoteState = (payload: RemoteState) => {
    if (!payload?.step) return;

    setCurrentStep(payload.step);
    if (payload.votingKey) {
      setVotingKey(payload.votingKey);
    }
    if (payload.ratingKey) {
      setRatingKey(payload.ratingKey);
    }
    if (Array.isArray(payload.currentOptions)) {
      setCurrentOptions(payload.currentOptions);
    }
    if (Array.isArray(payload.currentSingers)) {
      setCurrentSingers(payload.currentSingers);
    }

    if (payload.step === "VOTING") {
      const key = payload.votingKey || "";
      const alreadyVoted = key ? window.localStorage.getItem(voteStorageKey(key)) === "1" : false;
      setHasVoted(alreadyVoted);
    } else {
      setHasVoted(false);
    }

    if (payload.step === "RATING") {
      const key = payload.ratingKey || "";
      const categories = ["actitud", "ganas", "voz"].filter((category) => (
        key ? window.localStorage.getItem(ratingStorageKey(key, category)) === "1" : false
      ));
      setRatedCategories(categories);
    }
  };

  // 2. CONEXIÓN WEB SOCKET CON RECONEXIÓN
  useEffect(() => {
    const channel = supabase.channel(`room-${roomCode}`);
    channelRef.current = channel;
    
    channel
      .on("broadcast", { event: "sync_step" }, (data) => {
        applyRemoteState(data.payload);
      })
      .on("broadcast", { event: "sync_state" }, (data) => {
        applyRemoteState(data.payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          channel.send({ type: "broadcast", event: "request_sync", payload: { playerName: nameRef.current } });
        }
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setIsConnected(false);
      });

    return () => { 
        try { supabase.removeChannel(channel); } catch (e) {} 
        channelRef.current = null; 
    };
  }, [roomCode]);

  // 3. AVISAR A LA TELE QUE VOLVIMOS
  useEffect(() => {
    if (joined && isConnected && name) {
      try {
        channelRef.current?.send({ type: "broadcast", event: "new_player", payload: { name, avatar } });
        channelRef.current?.send({ type: "broadcast", event: "request_sync", payload: { playerName: name } });
      } catch (e) {}
    }
  }, [joined, isConnected, name, avatar]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = normalizePlayerName(name);
    if (!normalizedName || !isConnected) return;
    
    try {
      window.localStorage.setItem(`karaoke_vip_${roomCode}`, JSON.stringify({ savedName: normalizedName, savedAvatar: avatar }));
    } catch (e) {}
    
    setName(normalizedName);
    setJoined(true);
  };

  const leavePlayer = () => {
    try {
      window.localStorage.removeItem(`karaoke_vip_${roomCode}`);
    } catch {}
    setJoined(false);
    setName("");
    setHasVoted(false);
    setRatedCategories([]);
  };

  // 4. VOTAR SEGURO ANTI-CRASH
  const sendVote = async (songNum: 1 | 2) => {
    if (hasVoted) return;
    
    try {
        setHasVoted(true); // Bloqueo de UI
        if (channelRef.current) {
            await channelRef.current.send({ type: "broadcast", event: "vote", payload: { songNum, playerName: name } });
            if (votingKey) window.localStorage.setItem(voteStorageKey(votingKey, name), "1");
        }
    } catch (error) {
        console.error("Error enviando voto", error);
        // Si falla la conexión, le avisamos sin romper la app
        alert("Fallo de conexión. Intentá votar de nuevo.");
        setHasVoted(false);
    }
  };

  const sendRating = async (category: string, score: number) => {
    if (ratedCategories.includes(category)) return;
    
    try {
        setRatedCategories(prev => [...prev, category]);
        if (channelRef.current) {
            await channelRef.current.send({ type: "broadcast", event: "rate", payload: { category, score, playerName: name } });
            if (ratingKey) window.localStorage.setItem(ratingStorageKey(ratingKey, category, name), "1");
        }
    } catch (error) {
        setRatedCategories(prev => prev.filter(c => c !== category));
    }
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex flex-col justify-center text-white font-sans">
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl">
            <h1 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Sala: {roomCode}</h1>
            <p className="text-zinc-400 mb-6 font-medium">Creá tu Avatar VIP</p>
            
            <form onSubmit={handleJoin} className="flex flex-col gap-6">
              
              <div className="grid grid-cols-4 gap-3 mb-2 max-h-[250px] overflow-y-auto custom-scrollbar p-2">
                {AVATAR_SEEDS.map((seed) => (
                  <button 
                    key={seed} 
                    type="button"
                    onClick={() => setAvatar(seed)}
                    className={`aspect-square p-2 rounded-2xl transition-all ${avatar === seed ? 'bg-indigo-500/20 border-2 border-indigo-500 scale-105 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-black/40 border border-white/5 hover:bg-white/10 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'}`}
                  >
                    {/* AVATAR PREMIUM DESDE API */}
                    <img src={`https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${seed}`} alt="avatar" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>

              <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="TU NOMBRE..."
                  maxLength={15}
                  className="bg-black/60 border border-white/20 p-4 rounded-xl text-xl outline-none focus:border-indigo-500 transition-colors text-white font-black text-center uppercase tracking-widest shadow-inner"
              />
              <button disabled={!isConnected} type="submit" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl font-black text-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50 uppercase tracking-widest">
                  {isConnected ? "Entrar a la Fiesta" : "Conectando..."}
              </button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white flex flex-col items-center justify-center relative font-sans">
      
      {/* HEADER CON PERFIL PREMIUM */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-full p-1 border border-indigo-500/50">
               <img src={`https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${avatar}`} alt="avatar" className="w-full h-full" />
            </div>
            <div className="min-w-0">
              <span className="block font-black text-xl uppercase tracking-widest text-zinc-200 truncate">{name}</span>
              <span className={`flex items-center gap-1 text-xs font-bold uppercase tracking-widest ${isConnected ? "text-green-400" : "text-red-400"}`}>
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isConnected ? "Conectado" : "Reconectando"}
              </span>
            </div>
         </div>
         <button onClick={leavePlayer} className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 active:scale-95">
           <LogOut className="w-5 h-5" />
         </button>
      </div>

      {currentStep === "LOBBY" || currentStep === "ADMIN" || currentStep === "ROULETTE" || currentStep === "PLAYING" || currentStep === "LEADERBOARD" ? (
        <div className="text-center flex flex-col items-center gap-6 bg-white/5 p-10 rounded-[2rem] border border-white/10 shadow-2xl w-full max-w-sm">
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
          <h2 className="text-2xl font-bold text-zinc-300">Mirá la pantalla grande</h2>
          <p className="text-zinc-500 text-sm font-medium">El show está por arrancar...</p>
        </div>
      ) : null}

      {currentStep === "VOTING" && (
        <div className="w-full max-w-md space-y-6 mt-16">
          <h2 className="text-4xl font-black mb-8 text-center text-white">¡Elegí el Tema!</h2>
          {!hasVoted ? (
            <div className="flex flex-col gap-4">
              <button onClick={() => sendVote(1)} className="w-full bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500 p-8 rounded-[2rem] active:scale-95 transition-all text-indigo-100 shadow-[0_0_30px_rgba(99,102,241,0.2)] text-left">
                <span className="block text-xs font-black uppercase tracking-widest text-indigo-300 mb-3">Opción 1</span>
                <span className="block text-2xl font-black leading-tight">{currentOptions[0]?.title || "OPCIÓN 1"}</span>
                {currentOptions[0]?.artist && <span className="block text-base font-bold text-indigo-200/70 mt-2">{currentOptions[0].artist}</span>}
              </button>
              <button onClick={() => sendVote(2)} className="w-full bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500 p-8 rounded-[2rem] active:scale-95 transition-all text-purple-100 shadow-[0_0_30px_rgba(168,85,247,0.2)] text-left">
                <span className="block text-xs font-black uppercase tracking-widest text-purple-300 mb-3">Opción 2</span>
                <span className="block text-2xl font-black leading-tight">{currentOptions[1]?.title || "OPCIÓN 2"}</span>
                {currentOptions[1]?.artist && <span className="block text-base font-bold text-purple-200/70 mt-2">{currentOptions[1].artist}</span>}
              </button>
            </div>
          ) : (
            <div className="bg-green-900/20 border border-green-500/50 py-16 rounded-[2rem] text-center flex flex-col items-center gap-4 shadow-[0_0_40px_rgba(34,197,94,0.1)]">
              <CheckCircle2 className="w-20 h-20 text-green-400" />
              <p className="text-3xl font-black text-white uppercase tracking-widest">Voto Enviado</p>
            </div>
          )}
        </div>
      )}

      {currentStep === "RATING" && (
        <div className="w-full max-w-md space-y-4 mt-16">
          <h2 className="text-3xl font-black mb-6 text-center text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">JURADO VIP</h2>
          {currentSingers.length > 0 && (
            <p className="text-center text-zinc-300 font-black uppercase tracking-widest -mt-3 mb-6">
              {currentSingers.join(" & ")}
            </p>
          )}
          
          {[
            { key: "actitud", label: "Actitud en Escenario", icon: Flame },
            { key: "ganas", label: "Ganas / Pulmones", icon: Mic2 },
            { key: "voz", label: "Afinación / Voz", icon: Music }
          ].map((cat) => {
            const Icon = cat.icon;
            const isRated = ratedCategories.includes(cat.key);
            
            return (
              <div key={cat.key} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden shadow-lg">
                <div className="flex items-center gap-2 mb-4 justify-center text-zinc-300">
                  <Icon className="w-5 h-5 text-indigo-400" />
                  <span className="font-bold text-sm uppercase tracking-widest">{cat.label}</span>
                </div>
                
                {!isRated ? (
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        onClick={() => sendRating(cat.key, star)} 
                        className="p-3 bg-black/40 rounded-full active:bg-yellow-500/30 transition-all border border-white/5 active:scale-75 hover:scale-110"
                      >
                        <Star className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500" fill="currentColor" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-green-400 py-3">
                    <CheckCircle2 className="w-10 h-10 mb-2" />
                    <span className="font-bold text-sm uppercase tracking-widest">Puntaje Registrado</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
