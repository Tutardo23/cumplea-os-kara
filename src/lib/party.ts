export const PARTY_NAME = "Machi's Night";

export const BOCA_COLORS = {
  navy: "#001A3D",
  blue: "#003B7A",
  blueBright: "#0A53BE",
  gold: "#F7C600",
  goldSoft: "#FFD84D",
  ink: "#05080F",
  white: "#F7F8FA",
} as const;

export type GameStep =
  | "LOBBY"
  | "ROULETTE"
  | "VOTING"
  | "PLAYING"
  | "RATING"
  | "QUICK_EVENT"
  | "LEADERBOARD";

export type Song = {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
};

export type ReactionKind = "fire" | "clap" | "laugh" | "bolt";

export type SongPickMode = "CROWD" | "SINGER" | "RANDOM";

export type QuickEventType = "HYPE_RUSH" | "MAJORITY" | "REACTION_RACE";

export type QuickEvent = {
  id: string;
  type: QuickEventType;
  title: string;
  subtitle: string;
  duration: number;
  options?: [string, string];
  targetReaction?: ReactionKind;
};

export type PlayerStat = {
  appearances: number;
  lastAppearance: number;
  points: number;
};

export type PerformanceEntry = {
  id: string;
  singers: string[];
  song: Song;
  rating: number;
  hype: number;
  total: number;
};

export const FALLBACK_SONGS: Song[] = [
  { id: "1", title: "Persia, Yo Se Que Tu, Millonario", artist: "El Rodri", youtubeId: "DPr-EkqFgJ4" },
  { id: "2", title: "Siento, Hawai, Como Se Siente", artist: "El Rodri", youtubeId: "17OXrCKXob8" },
  { id: "3", title: "YO ERA", artist: "Q'Lokura", youtubeId: "ZiE3jKg-j9g" },
  { id: "4", title: "Yo tomo licor", artist: "Amar Azul", youtubeId: "tYvbAXkzHus" },
  { id: "5", title: "Freed From Desire", artist: "Gala", youtubeId: "9R2r2rxuOR8" },
  { id: "6", title: "Sweet Child O' Mine", artist: "Guns N' Roses", youtubeId: "_MmsUzoFOwI" },
  { id: "7", title: "Wonderwall", artist: "Oasis", youtubeId: "I4RwbQ9zUEU" },
  { id: "8", title: "Suavemente", artist: "Elvis Crespo", youtubeId: "J12-H5MnPFo" },
  { id: "9", title: "Despechá", artist: "Rosalía", youtubeId: "wvPZm3sCQh8" },
  { id: "10", title: "Inocente", artist: "La Delio Valdez", youtubeId: "wXksV9qgXmI" },
  { id: "11", title: "Borro Cassette", artist: "Maluma", youtubeId: "_WaxARUrbz0" },
  { id: "12", title: "Intento", artist: "Ulises Bueno", youtubeId: "t2eNyFVIgEc" },
  { id: "13", title: "Mientes", artist: "Camila", youtubeId: "EklsRMT8lKw" },
  { id: "14", title: "Día de Enero", artist: "Shakira", youtubeId: "IV4jZ8FZFIE" },
  { id: "15", title: "Nada Fue Un Error", artist: "Coti", youtubeId: "1-TmRyA7_1I" },
  { id: "16", title: "Olvídala", artist: "Los Palmeras", youtubeId: "oP5nkZpl05g" },
  { id: "17", title: "Me Rehúso", artist: "Danny Ocean", youtubeId: "yz-cZShgXAE" },
  { id: "18", title: "Lo Mejor del Amor", artist: "Rodrigo", youtubeId: "93o4Rmmg2oc" },
  { id: "19", title: "Qué es Dios", artist: "Las Pastillas del Abuelo", youtubeId: "15a0TY4cGRA" },
  { id: "20", title: "La Noche No Es Para Dormir", artist: "Mano Arriba", youtubeId: "gGJBusxMZ_0" },
  { id: "21", title: "Loquita", artist: "Márama", youtubeId: "BuEb9NFDMsM" },
  { id: "22", title: "Llora Me Llama", artist: "Grupo Play", youtubeId: "jcEpX1RPvHM" },
  { id: "23", title: "Una Cerveza", artist: "Ráfaga", youtubeId: "g-Vu4mzZ0r8" },
  { id: "24", title: "Andas En Mi Cabeza", artist: "Chino & Nacho, Daddy Yankee", youtubeId: "_bdXSot50kU" },
  { id: "25", title: "Nena", artist: "Márama", youtubeId: "Uqf5V67pd0I" },
  { id: "26", title: "Los Del Espacio", artist: "LIT killah, Duki", youtubeId: "emTC0FBpyeg" },
  { id: "27", title: "Baby", artist: "Justin Bieber", youtubeId: "1a5SWpp9Wfg" },
  { id: "28", title: "La Morocha", artist: "Luck Ra, BM", youtubeId: "SjIkoBNZOOQ" },
  { id: "29", title: "Quevedo: Bzrp Session", artist: "Bizarrap", youtubeId: "ymWTYk90NcU" },
  { id: "30", title: "Un Finde", artist: "Big One, Ke Personajes", youtubeId: "eY7H7_U0H0Q" },
  { id: "31", title: "Danza Kuduro", artist: "Don Omar", youtubeId: "QSWmgNMK-VM" },
  { id: "32", title: "De Música Ligera", artist: "Soda Stereo", youtubeId: "X5iGNQN_Ijg" },
  { id: "33", title: "Tusa", artist: "Karol G", youtubeId: "zGL6g6_6GUM" },
  { id: "34", title: "La Bachata", artist: "Manuel Turizo", youtubeId: "tLPUmT6s8O8" },
  { id: "35", title: "Ojitos Rojos", artist: "Ke Personajes x Grupo Frontera", youtubeId: "7aX_4M02AHA" },
];

export const MAJORITY_PROMPTS: Array<[string, string]> = [
  ["Audio de 8 minutos", "Tenemos que hablar"],
  ["Salir sin batería", "Salir sin datos"],
  ["Llegar una hora temprano", "Llegar una hora tarde"],
  ["Perder el celular", "Perder las llaves"],
  ["Que corten la música", "Que prendan todas las luces"],
  ["Cantar primero", "Cantar último"],
  ["Elegir siempre la canción", "No elegir nunca"],
  ["Bailar solo", "Cantar solo"],
];

export const QUICK_EVENT_TITLES = {
  HYPE_RUSH: {
    title: "PULSO XENEIZE",
    subtitle: "Ocho segundos. Toquen tan rápido como puedan.",
  },
  MAJORITY: {
    title: "LA TRIBUNA DECIDE",
    subtitle: "Elegí rápido. No hay respuesta correcta.",
  },
  REACTION_RACE: {
    title: "REFLEJOS",
    subtitle: "Tocá el símbolo correcto antes que el resto.",
  },
} as const;

export function normalizePlayerName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function getInitials(name: string) {
  return normalizePlayerName(name)
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function getSingerCount(turn: number, playerCount: number) {
  const pattern = [1, 2, 1, 2, 1, 3];
  const desired = pattern[(turn - 1) % pattern.length];
  return Math.max(1, Math.min(desired, playerCount));
}

export function getSongPickMode(turn: number): SongPickMode {
  const pattern: SongPickMode[] = ["CROWD", "RANDOM", "SINGER", "CROWD", "RANDOM", "CROWD"];
  return pattern[(turn - 1) % pattern.length];
}

export function pickFairSingers(
  players: string[],
  stats: Record<string, PlayerStat>,
  count: number,
  turn: number,
) {
  return [...players]
    .map((player) => ({
      player,
      random: Math.random(),
      stat: stats[player] || { appearances: 0, lastAppearance: -999, points: 0 },
    }))
    .sort((a, b) => {
      const recencyA = Math.max(0, 3 - (turn - a.stat.lastAppearance));
      const recencyB = Math.max(0, 3 - (turn - b.stat.lastAppearance));
      const weightA = a.stat.appearances * 10 + recencyA * 4;
      const weightB = b.stat.appearances * 10 + recencyB * 4;
      return weightA - weightB || a.random - b.random;
    })
    .slice(0, count)
    .map(({ player }) => player);
}

export function pickTwoSongs(pool: Song[], fallback: Song[]) {
  const source = pool.length >= 2 ? [...pool] : [...fallback];
  const shuffled = source.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

export function makeQuickEvent(index: number): QuickEvent {
  const rotation: QuickEventType[] = ["HYPE_RUSH", "MAJORITY", "REACTION_RACE"];
  const type = rotation[index % rotation.length];
  const base = QUICK_EVENT_TITLES[type];

  if (type === "MAJORITY") {
    const options = MAJORITY_PROMPTS[index % MAJORITY_PROMPTS.length];
    return {
      id: `majority-${Date.now()}-${index}`,
      type,
      title: base.title,
      subtitle: base.subtitle,
      duration: 7,
      options,
    };
  }

  if (type === "REACTION_RACE") {
    const reactions: ReactionKind[] = ["fire", "clap", "laugh", "bolt"];
    return {
      id: `reaction-${Date.now()}-${index}`,
      type,
      title: base.title,
      subtitle: base.subtitle,
      duration: 6,
      targetReaction: reactions[index % reactions.length],
    };
  }

  return {
    id: `hype-${Date.now()}-${index}`,
    type,
    title: base.title,
    subtitle: base.subtitle,
    duration: 8,
  };
}
