"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic2, Trophy, ChevronDown, Star, Ghost, ListOrdered, Settings, Trash2, Plus, FastForward, PlayCircle, X, Music } from "lucide-react";
import YouTube from "react-youtube";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import confetti from 'canvas-confetti';

// ¡RESCATÉ TODAS TUS CANCIONES DE LAS FOTOS!
const RESCUED_SONGS = [
  { id: "1", title: "Persia, Yo Se Que Tu, Millonario", artist: "El Rodri", youtubeId: "DPr-EkqFgJ4" },
  { id: "2", title: "Siento, Hawai, Como Se Siente", artist: "El Rodri", youtubeId: "17OXrCKXob8" },
  { id: "3", title: "YO ERA", artist: "Q'Lokura", youtubeId: "ZiE3jKg-j9g" },
  { id: "4", title: "Yo tomo licor", artist: "Amar azul", youtubeId: "tYvbAXkzHus" },
  { id: "5", title: "Freed From Desire", artist: "Gala", youtubeId: "9R2r2rxuOR8" },
  { id: "6", title: "Sweet Child O' Mine", artist: "Guns N' Roses", youtubeId: "_MmsUzoFOwI" },
  { id: "7", title: "Wonderwall", artist: "Oasis", youtubeId: "I4RwbQ9zUEU" },
  { id: "8", title: "Suavemente", artist: "Elvis Crespo", youtubeId: "J12-H5MnPFo" },
  { id: "9", title: "Rosalía", artist: "Despechá", youtubeId: "wvPZm3sCQh8" },
  { id: "10", title: "Inocente", artist: "La Delio Valdez", youtubeId: "wXksV9qgXmI" },
  { id: "11", title: "Borro Cassette", artist: "Maluma", youtubeId: "_WaxARUrbz0" },
  { id: "12", title: "INTENTO", artist: "Ulises Bueno", youtubeId: "t2eNyFVIgEc" },
  { id: "13", title: "Mientes", artist: "Camila", youtubeId: "EklsRMT8lKw" },
  { id: "14", title: "Dia De Enero", artist: "Shakira", youtubeId: "IV4jZ8FZFIE" },
  { id: "15", title: "Nada Fue Un Error", artist: "Coti", youtubeId: "1-TmRyA7_1I" },
  { id: "16", title: "OLVIDALA", artist: "Los Palmeras", youtubeId: "oP5nkZpl05g" },
  { id: "17", title: "Me rehúso", artist: "Danny Ocean", youtubeId: "yz-cZShgXAE" },
  { id: "18", title: "Lo Mejor del Amor", artist: "Rodrigo", youtubeId: "93o4Rmmg2oc" },
  { id: "19", title: "Que es Dios", artist: "Las pastillas del abuelo", youtubeId: "15a0TY4cGRA" },
  { id: "20", title: "La noche no es para dormir", artist: "Mano Arriba", youtubeId: "gGJBusxMZ_0" },
  { id: "21", title: "Loquita", artist: "Marama", youtubeId: "BuEb9NFDMsM" },
  { id: "22", title: "Llora me llama", artist: "Grupo Play", youtubeId: "jcEpX1RPvHM" },
  { id: "23", title: "Una cerveza", artist: "Ráfaga", youtubeId: "g-Vu4mzZ0r8" },
  { id: "24", title: "Andas En Mi Cabeza", artist: "Chino & Nacho, Daddy Yankee", youtubeId: "_bdXSot50kU" },
  { id: "25", title: "Nena", artist: "Marama", youtubeId: "Uqf5V67pd0I" },
  { id: "26", title: "Los Del Espacio", artist: "LIT killah, Duki", youtubeId: "emTC0FBpyeg" },
  { id: "27", title: "Baby", artist: "Justin Bieber", youtubeId: "1a5SWpp9Wfg" },
  { id: "28", title: "La Morocha", artist: "Luck Ra, BM", youtubeId: "SjIkoBNZOOQ" },
  { id: "29", title: "Quevedo: Bzrp Session", artist: "Bizarrap", youtubeId: "ymWTYk90NcU" },
  { id: "30", title: "Un Finde", artist: "Big One, Ke Personajes", youtubeId: "eY7H7_U0H0Q" },
  { id: "31", title: "Danza Kuduro", artist: "Don Omar", youtubeId: "QSWmgNMK-VM" },
  { id: "32", title: "De Música Ligera", artist: "Soda Stereo", youtubeId: "X5iGNQN_Ijg" },
   { id: "33", title: "Tusa", artist: "Karol G", youtubeId: "zGL6g6_6GUM" },
  { id: "34", title: "La Bachata", artist: "Manuel Turizo", youtubeId: "tLPUmT6s8O8" },
];

const TOURNAMENT_ROUNDS = [
  { id: 1, name: "Ronda 1: Solos", type: 1, totalTurns: 4, desc: "A ver quién se anima a arrancar..." },
  { id: 2, name: "Ronda 2: Dúos", type: 2, totalTurns: 3, desc: "Busquen cómplices para el crimen." },
];

const WHEEL_COLORS = ["#4f46e5", "#db2777", "#7c3aed", "#ea580c", "#059669"];

type ScoreEntry = { singers: string[]; actitud: number; ganas: number; voz: number; total: number; };

export default function KaraokeRoulette() {
  const [step, setStep] = useState<"LOBBY" | "ADMIN" | "ROULETTE" | "VOTING" | "PLAYING" | "RATING" | "LEADERBOARD">("LOBBY");
  const [players, setPlayers] = useState<string[]>([]);
  const [newPlayer, setNewPlayer] = useState("");
  
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [currentSingers, setCurrentSingers] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  
  // ESTADO DE CANCIONES (CON SUPABASE)
  const [masterSongs, setMasterSongs] = useState([...RESCUED_SONGS]);
  const [availableSongs, setAvailableSongs] = useState([...RESCUED_SONGS]);
  const [currentOptions, setCurrentOptions] = useState<typeof RESCUED_SONGS>([]);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [showSongList, setShowSongList] = useState(false);

  const [votes, setVotes] = useState({ song1: 0, song2: 0 });
  const [winnerSong, setWinnerSong] = useState(RESCUED_SONGS[0]);
  
  const [ratings, setRatings] = useState({ 
    actitud: { sum: 0, count: 0 }, ganas: { sum: 0, count: 0 }, voz: { sum: 0, count: 0 } 
  });
  
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showPartners, setShowPartners] = useState(false);

  const currentRound = TOURNAMENT_ROUNDS[currentRoundIdx];
  const params = useParams();
  const roomCode = params.roomCode as string;

  const channelRef = useRef<any>(null);
  const votedPlayersRef = useRef<Set<string>>(new Set());

  // 1. CARGAR CANCIONES DESDE LA BASE DE DATOS (SUPABASE)
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        // Cambiamos select('*') para traer todo sin filtros de columnas
        const { data, error } = await supabase.from('karaoke_songs').select('*');
        if (error) throw error;
        
        if (data && data.length > 0) {
          setMasterSongs(data);
          setAvailableSongs(data);
        }
      } catch (err) {
        console.error("Error al cargar canciones:", err);
        // Fallback a las rescatadas si falla la base
        setMasterSongs(RESCUED_SONGS);
      }
    };
    fetchSongs();
  }, []);
  // 2. CONECTAR CELULARES
  useEffect(() => {
    if (!roomCode) return;
    const channel = supabase.channel(`room-${roomCode}`);
    channelRef.current = channel;
    
    channel
      .on("broadcast", { event: "new_player" }, (data) => {
        setPlayers((prev) => !prev.includes(data.payload.name) ? [...prev, data.payload.name] : prev);
      })
      .on("broadcast", { event: "vote" }, (data) => {
        if (data.payload.playerName && votedPlayersRef.current.has(data.payload.playerName)) return;
        if (data.payload.playerName) votedPlayersRef.current.add(data.payload.playerName);
        setVotes((prev) => {
          const next = { ...prev };
          data.payload.songNum === 1 ? next.song1++ : next.song2++;
          return next;
        });
      })
      .on("broadcast", { event: "rate" }, (data) => {
        const cat = data.payload.category as "actitud" | "ganas" | "voz";
        setRatings((prev) => ({
          ...prev,
          [cat]: { sum: prev[cat].sum + data.payload.score, count: prev[cat].count + 1 }
        }));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: "broadcast", event: "sync_step", payload: { step } });
        }
      });

    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  useEffect(() => {
    if (channelRef.current && step) {
      try { channelRef.current.send({ type: "broadcast", event: "sync_step", payload: { step } }); } catch (e) {}
    }
  }, [step]);

  // VOTOS AUTOMÁTICOS
  const requiredVotes = Math.floor(players.length / 2) + 1;
  useEffect(() => {
    const totalVotes = votes.song1 + votes.song2;
    if (step === "VOTING" && totalVotes >= requiredVotes && currentOptions.length === 2) {
      setWinnerSong(votes.song1 > votes.song2 ? currentOptions[0] : currentOptions[1]);
      setTimeout(() => setStep("PLAYING"), 1000);
    }
  }, [votes, step, requiredVotes, currentOptions]);

  const forceWinner = (optionIndex: 0 | 1) => {
      setWinnerSong(currentOptions[optionIndex]);
      setStep("PLAYING");
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayer.trim() && !players.includes(newPlayer)) {
      setPlayers((prev) => [...prev, newPlayer]);
      setNewPlayer("");
    }
  };

  const removePlayer = (name: string) => {
      setPlayers(players.filter(p => p !== name));
  };

  // ADMIN DE CANCIONES Y GUARDADO EN SUPABASE
  const handleUpdateSong = (id: string, field: string, value: string) => {
      setMasterSongs(masterSongs.map(song => song.id === id ? { ...song, [field]: value } : song));
  };
  const handleAddSong = () => {
      setMasterSongs([{ id: Date.now().toString(), title: "Nueva Canción", artist: "Artista", youtubeId: "" }, ...masterSongs]);
  };
  const handleDeleteSong = (id: string) => {
      setMasterSongs(masterSongs.filter(s => s.id !== id));
  };
  
  // AL GUARDAR, SUBE A LA BASE DE DATOS PARA QUE NO SE PIERDA NUNCA MÁS
  const saveAdminAndReturn = async () => {
      try {
        // Mapeamos los datos para que coincidan con la base de datos (youtubeid en minúsculas)
        const songsToUpload = masterSongs.map(song => ({
            id: song.id,
            title: song.title,
            artist: song.artist,
            youtubeid: song.youtubeId // Aquí está el truco: pasamos el valor de youtubeId a la columna youtubeid
        }));

        const { error } = await supabase.from('karaoke_songs').upsert(songsToUpload);
        
        if (error) {
            console.error("ERROR DE SUPABASE DETALLADO:", error);
            alert("Error al guardar: " + error.message);
        } else {
            alert("¡Guardado correctamente en la nube!");
            setAvailableSongs([...masterSongs]); 
            setStep("LOBBY");
        }
      } catch (err) {
        console.error("Fallo total al conectar:", err);
      }
  };
  const startRoulette = () => {
    if (players.length < 3) return alert("¡Agregá al menos 3 personas!");
    setStep("ROULETTE");
    setIsSpinning(true);
    setShowPartners(false);
    
    setVotes({ song1: 0, song2: 0 });
    votedPlayersRef.current.clear();
    setRatings({ actitud: { sum: 0, count: 0 }, ganas: { sum: 0, count: 0 }, voz: { sum: 0, count: 0 } });

    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, currentRound.type);
    
    const captainIdx = players.indexOf(selected[0]);
    const sliceAngle = 360 / players.length;
    const sliceCenter = (captainIdx * sliceAngle) + (sliceAngle / 2);
    const spins = 360 * 5;
    const targetRotation = wheelRotation + spins + (360 - sliceCenter) - (wheelRotation % 360);

    setWheelRotation(targetRotation);
    setCurrentSingers(selected);
  };

  const onSpinComplete = () => {
    setIsSpinning(false);
    let pool = [...availableSongs];
    if (pool.length < 2) pool = [...masterSongs]; 

    const shuffledSongs = pool.sort(() => 0.5 - Math.random());
    setCurrentOptions(shuffledSongs.slice(0, 2));
    setAvailableSongs(shuffledSongs.slice(2));

    setTimeout(() => {
        setShowPartners(currentRound.type > 1);
        setTimeout(() => setStep("VOTING"), currentRound.type > 1 ? 3000 : 1500);
    }, 500);
  };

  const saveScoreAndContinue = () => {
    const avgActitud = ratings.actitud.count > 0 ? Math.round(ratings.actitud.sum / ratings.actitud.count) : 0;
    const avgGanas = ratings.ganas.count > 0 ? Math.round(ratings.ganas.sum / ratings.ganas.count) : 0;
    const avgVoz = ratings.voz.count > 0 ? Math.round(ratings.voz.sum / ratings.voz.count) : 0;
    const total = avgActitud + avgGanas + avgVoz;

    setLeaderboard([...leaderboard, { singers: currentSingers, actitud: avgActitud, ganas: avgGanas, voz: avgVoz, total }]);
    
    if (currentTurn < currentRound.totalTurns) {
      setCurrentTurn(currentTurn + 1);
    } else if (currentRoundIdx < TOURNAMENT_ROUNDS.length - 1) {
      setCurrentRoundIdx(currentRoundIdx + 1);
      setCurrentTurn(1);
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, zIndex: 100 });
    } else {
      confetti({ particleCount: 300, spread: 160, origin: { y: 0.5 }, zIndex: 100 });
    }
    setStep("LEADERBOARD");
  };

  return (
    <div className="relative min-h-screen text-white flex flex-col items-center justify-center p-4 font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* FONDO PREMIUM */}
      <div className="absolute inset-0 z-[-1] bg-black">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-30 mix-blend-screen">
          <source src="https://cdn.pixabay.com/video/2023/11/02/187428-880193154_large.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-[6px]"></div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* --- FASE 0: ADMIN CON VISTA PREVIA --- */}
        {step === "ADMIN" && (
           <motion.div key="admin" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-5xl bg-zinc-900/90 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl relative z-10 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-4xl font-black text-white">Editor de Canciones (En Base de Datos)</h2>
                  <div className="flex gap-4">
                      <button onClick={handleAddSong} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5"/> Agregar</button>
                      <button onClick={saveAdminAndReturn} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-xl font-bold shadow-[0_0_15px_rgba(34,197,94,0.5)]">Guardar en la Nube y Volver</button>
                  </div>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar flex-1 pr-4 space-y-4">
                  {masterSongs.map((song) => (
                      <div key={song.id} className="flex gap-4 items-center bg-black/40 p-4 rounded-2xl border border-white/10">
                          <input value={song.title} onChange={(e) => handleUpdateSong(song.id, 'title', e.target.value)} placeholder="Título" className="flex-[2] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" />
                          <input value={song.artist} onChange={(e) => handleUpdateSong(song.id, 'artist', e.target.value)} placeholder="Artista" className="flex-[1.5] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" />
                          <input value={song.youtubeId} onChange={(e) => handleUpdateSong(song.id, 'youtubeId', e.target.value)} placeholder="ID YouTube" className="flex-[1.5] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-indigo-300 font-mono outline-none focus:border-indigo-500" />
                          
                          <button onClick={() => { if(song.youtubeId) setPreviewVideoId(song.youtubeId) }} className="p-3 bg-blue-900/40 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-colors" title="Probar Video">
                            <PlayCircle className="w-5 h-5"/>
                          </button>
                          
                          <button onClick={() => handleDeleteSong(song.id)} className="p-3 bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors" title="Eliminar">
                            <Trash2 className="w-5 h-5"/>
                          </button>
                      </div>
                  ))}
              </div>

              {/* MODAL DE VISTA PREVIA */}
              <AnimatePresence>
                {previewVideoId && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-10">
                    <div className="w-full max-w-5xl bg-zinc-950 p-6 rounded-[2rem] border border-white/20 shadow-2xl flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2"><PlayCircle className="w-6 h-6 text-indigo-400"/> Probando Video</h3>
                        <button onClick={() => setPreviewVideoId(null)} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-3 rounded-xl transition-colors">
                          <X className="w-6 h-6"/>
                        </button>
                      </div>
                      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-inner">
                        <YouTube videoId={previewVideoId} opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1 } }} className="w-full h-full"/>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </motion.div>
        )}

        {/* --- FASE 1: LOBBY --- */}
        {step === "LOBBY" && (
          <motion.div key="lobby" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-4xl text-center relative z-10">
            <h1 className="text-7xl font-black mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
              Mati&apos;s Fest
            </h1>
            
            <div className="flex justify-center gap-4 mb-12">
                <div className="bg-white/10 backdrop-blur-md px-10 py-4 rounded-3xl border border-white/20 shadow-xl flex items-center">
                    <span className="text-xl text-zinc-300 font-bold uppercase tracking-widest">Código Sala: <strong className="text-indigo-400 text-3xl ml-2">{roomCode}</strong></span>
                </div>
                
                <button onClick={() => setShowSongList(true)} className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-400/30 px-6 py-4 rounded-3xl transition-colors shadow-xl flex items-center gap-3">
                    <Music className="w-6 h-6 text-indigo-300" />
                    <span className="font-bold text-indigo-100 uppercase tracking-widest">{masterSongs.length} Temas</span>
                </button>

                <button onClick={() => setStep("ADMIN")} className="bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-4 rounded-3xl transition-colors shadow-xl flex items-center gap-2">
                    <Settings className="w-6 h-6 text-zinc-300" />
                </button>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2rem] shadow-2xl mb-10">
              <form onSubmit={handleAddPlayer} className="flex gap-4 mb-10">
                <input
                  type="text"
                  value={newPlayer}
                  onChange={(e) => setNewPlayer(e.target.value)}
                  placeholder="Añadir cantante..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl outline-none focus:border-indigo-500 text-white transition-all shadow-inner"
                />
                <button type="submit" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 rounded-2xl font-black text-3xl hover:scale-105 transition-transform shadow-lg">
                  +
                </button>
              </form>
              
              <div className="flex flex-wrap justify-center gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                <AnimatePresence>
                  {players.map((p, i) => (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ scale: 0 }} key={i} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3 group">
                      <Mic2 className="w-5 h-5 text-indigo-400" />
                      <span className="font-bold text-xl">{p}</span>
                      <button onClick={() => removePlayer(p)} className="ml-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-5 h-5"/></button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {players.length >= 3 && (
              <button onClick={startRoulette} className="w-full bg-white text-black py-6 rounded-[2rem] font-black text-3xl shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:bg-zinc-200 hover:scale-[1.02] transition-all">
                ¡EMPEZAR SHOW!
              </button>
            )}

            {/* MODAL DE REPERTORIO (SOLO LECTURA) */}
            <AnimatePresence>
              {showSongList && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-2xl bg-zinc-900/90 border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col max-h-[80vh]">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Music className="w-8 h-8 text-indigo-400" /> 
                        Repertorio de la Fiesta
                      </h2>
                      <button onClick={() => setShowSongList(false)} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors">
                        <X className="w-6 h-6"/>
                      </button>
                    </div>
                    
                    <div className="overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                      {masterSongs.map(s => (
                        <div key={s.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:bg-white/10 transition-colors">
                          <span className="font-bold text-lg text-indigo-50">{s.title}</span>
                          <span className="text-zinc-400 font-medium">{s.artist}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* --- FASE 2: RULETA PREMIUM --- */}
        {step === "ROULETTE" && (
          <motion.div key="roulette" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full flex flex-col items-center relative z-10">
            <div className="mb-10 bg-black/50 px-10 py-5 rounded-full border border-white/10 backdrop-blur-md shadow-2xl">
                <h3 className="text-indigo-300 font-bold tracking-widest uppercase text-sm mb-1">{currentRound.name} (Turno {currentTurn}/{currentRound.totalTurns})</h3>
                <h2 className="text-4xl font-black text-white drop-shadow-lg">
                {isSpinning ? "Girando Ruleta..." : `Seleccionado: ${currentSingers[0]}`}
                </h2>
            </div>

            <div className="relative w-[500px] h-[500px] mb-12">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                <ChevronDown className="w-28 h-28" fill="currentColor" />
              </div>
              
              <motion.div
                className="w-full h-full rounded-full border-[8px] border-white/20 shadow-[0_0_60px_rgba(99,102,241,0.4)] overflow-hidden relative backdrop-blur-sm"
                animate={{ rotate: wheelRotation }}
                transition={{ duration: 5, ease: [0.1, 0.9, 0.2, 1] }}
                onAnimationComplete={onSpinComplete}
                style={{
                  background: `conic-gradient(${players.map((_, i) => {
                    const slice = 360 / players.length;
                    return `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * slice}deg ${(i + 1) * slice}deg`;
                  }).join(', ')})`
                }}
              >
                {players.map((player, i) => {
                  const slice = 360 / players.length;
                  const rotation = (i * slice) + (slice / 2);
                  return (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${rotation}deg)` }}>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 pt-8 origin-bottom h-1/2">
                        <span className="font-black text-4xl text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">{player}</span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
              <div className="absolute inset-[180px] rounded-full bg-zinc-950 border-[6px] border-white/10 z-10 flex items-center justify-center shadow-inner">
                 <Ghost className="w-16 h-16 text-zinc-700" />
              </div>
            </div>

            <AnimatePresence>
              {showPartners && currentRound.type > 1 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-indigo-950/80 backdrop-blur-xl border border-indigo-500/50 p-6 rounded-3xl shadow-2xl">
                  <p className="text-indigo-200 text-sm mb-2 font-bold uppercase tracking-widest">Acompañado por:</p>
                  <div className="flex gap-6 justify-center text-4xl font-black text-white drop-shadow-md">
                    {currentSingers.slice(1).map((partner, i) => (<span key={i}>{partner}</span>))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* --- FASE 3: VOTACIÓN --- */}
        {step === "VOTING" && (
           <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-6xl text-center relative z-10">
            <h2 className="text-6xl font-black mb-4 text-white">¿Qué van a cantar?</h2>
            <div className="bg-black/50 inline-block px-6 py-2 rounded-full border border-white/10 mb-10">
                <span className="text-zinc-300 font-bold uppercase tracking-widest text-sm">Se necesitan {requiredVotes} votos (Mitad + 1) para avanzar</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {currentOptions.map((song, index) => {
                const num = index + 1;
                const songVotes = num === 1 ? votes.song1 : votes.song2;
                
                return (
                  <div key={num} className="flex flex-col gap-3">
                      <div className="relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/20 rounded-[3rem] p-10 text-left shadow-2xl h-full flex flex-col">
                        <div className="relative z-10 flex flex-col h-full">
                          <h3 className="text-4xl font-black mb-3 text-white">{song.title}</h3>
                          <p className="text-2xl text-zinc-400 mb-12 font-bold">{song.artist}</p>
                          
                          <div className="mt-auto flex justify-between items-end bg-black/40 p-6 rounded-3xl border border-white/5">
                            <span className="text-zinc-500 font-bold text-xl uppercase tracking-widest">Votos</span>
                            <span className={`text-8xl font-black leading-none ${num === 1 ? 'text-indigo-400' : 'text-purple-400'}`}>{songVotes}</span>
                          </div>
                        </div>
                        <motion.div className={`absolute bottom-0 left-0 h-3 ${num === 1 ? 'bg-indigo-500' : 'bg-purple-500'}`} initial={{ width: 0 }} animate={{ width: `${(songVotes / requiredVotes) * 100}%` }} />
                      </div>
                      
                      <button onClick={() => forceWinner(index as 0|1)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-500 hover:text-white py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors uppercase text-sm font-bold tracking-widest">
                          <FastForward className="w-4 h-4"/> Forzar esta canción
                      </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* --- FASE 4: SHOW YOUTUBE (CINE) --- */}
        {step === "PLAYING" && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 w-screen h-screen z-50 flex flex-col items-center justify-center bg-black p-6">
                <div className="w-full max-w-7xl h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{currentSingers.join(" & ")}</h2>
                        <button onClick={() => setStep("RATING")} className="bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-2 rounded-full font-bold text-white transition-all uppercase text-sm tracking-widest">
                            Pasar al Jurado
                        </button>
                    </div>
                    <div className="flex-1 w-full rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] bg-black relative">
                        <YouTube videoId={winnerSong.youtubeId} opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1 } }} className="absolute inset-0 w-full h-full" onEnd={() => setStep("RATING")}/>
                    </div>
                </div>
            </motion.div>
        )}

        {/* --- FASE 5: JURADO MULTI-CATEGORÍA --- */}
        {step === "RATING" && (
             <motion.div key="rating" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-12 rounded-[3rem] shadow-2xl text-center relative z-10">
                <h2 className="text-5xl font-black mb-4 text-white">¡Momento de Votar!</h2>
                <p className="text-xl text-zinc-300 mb-10 font-medium">Puntúen las categorías desde el celular</p>
                
                <div className="space-y-6 mb-12">
                  {[
                    { key: "actitud", label: "Actitud en Escenario", avg: ratings.actitud.count > 0 ? Math.round(ratings.actitud.sum / ratings.actitud.count) : 0, count: ratings.actitud.count },
                    { key: "ganas", label: "Ganas / Pulmones", avg: ratings.ganas.count > 0 ? Math.round(ratings.ganas.sum / ratings.ganas.count) : 0, count: ratings.ganas.count },
                    { key: "voz", label: "Afinación / Voz", avg: ratings.voz.count > 0 ? Math.round(ratings.voz.sum / ratings.voz.count) : 0, count: ratings.voz.count }
                  ].map((cat) => (
                    <div key={cat.key} className="flex flex-col items-center bg-black/40 p-6 rounded-3xl border border-white/5">
                      <div className="flex justify-between w-full items-center mb-4 px-4">
                        <span className="text-sm text-zinc-300 font-bold tracking-widest uppercase">{cat.label}</span>
                        <span className="text-xs text-zinc-500 font-mono">{cat.count} votos</span>
                      </div>
                      <div className="flex gap-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-12 h-12 ${cat.avg >= star ? "text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" : "text-white/10"}`} fill="currentColor" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={saveScoreAndContinue} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 text-white py-6 rounded-2xl font-black text-3xl transition-transform shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                    Ver Ranking (o Forzar Avance)
                </button>
             </motion.div>
        )}

        {/* --- FASE 6: TABLA DE POSICIONES --- */}
        {step === "LEADERBOARD" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl text-center relative z-10">
                 <div className="bg-black/50 backdrop-blur-md inline-flex items-center gap-4 px-10 py-5 rounded-full border border-white/10 mb-12 shadow-xl">
                    <ListOrdered className="w-10 h-10 text-indigo-400" />
                    <h2 className="text-5xl font-black text-white tracking-tighter">Ranking del Terror</h2>
                 </div>
                 
                 <div className="bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 overflow-hidden mb-12 shadow-2xl">
                     <table className="w-full text-left">
                         <thead>
                             <tr className="bg-black/60 text-zinc-300 text-sm uppercase tracking-widest">
                                 <th className="p-8 font-black">Cantantes</th>
                                 <th className="p-8 text-center font-bold">Actitud</th>
                                 <th className="p-8 text-center font-bold">Ganas</th>
                                 <th className="p-8 text-center font-bold">Voz</th>
                                 <th className="p-8 text-center font-black text-white text-lg">Total</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                             {[...leaderboard].sort((a,b) => b.total - a.total).map((entry, i) => (
                                 <tr key={i} className="hover:bg-white/5 transition-colors">
                                     <td className="p-8 font-bold text-2xl text-white flex items-center gap-4">
                                        {i === 0 && <Trophy className="w-8 h-8 text-yellow-500" />}
                                        {entry.singers.join(" & ")}
                                     </td>
                                     <td className="p-8 text-center font-mono text-2xl text-zinc-300">{entry.actitud} <Star className="w-5 h-5 inline text-yellow-500 mb-1" fill="currentColor"/></td>
                                     <td className="p-8 text-center font-mono text-2xl text-zinc-300">{entry.ganas} <Star className="w-5 h-5 inline text-yellow-500 mb-1" fill="currentColor"/></td>
                                     <td className="p-8 text-center font-mono text-2xl text-zinc-300">{entry.voz} <Star className="w-5 h-5 inline text-yellow-500 mb-1" fill="currentColor"/></td>
                                     <td className="p-8 text-center font-black text-5xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                         {entry.total}
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
                 <button onClick={startRoulette} className="bg-white text-black py-6 px-16 rounded-[2rem] font-black text-3xl shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105 transition-transform">
                    {currentRoundIdx === TOURNAMENT_ROUNDS.length - 1 && currentTurn === currentRound.totalTurns ? "Finalizar Show" : "Siguiente Turno"}
                 </button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}