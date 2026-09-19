export type AvatarKey =
  | "star"
  | "guitar"
  | "headphones"
  | "disc"
  | "gamepad"
  | "radio"
  | "crown"
  | "bolt";

export type ReactionKind = "fire" | "heart" | "clap" | "skull";

export type SongSource = { type: "youtube"; videoId: string };

export type Song = {
  id: string;
  title: string;
  artist: string;
  source: SongSource;
};

export type Player = {
  name: string;
  avatar: AvatarKey;
};

export type KaraokeMode = "EXPRESS" | "DUO" | "BOMB" | "RESCUE" | "DUEL";

export type PowerKind = "PASS" | "DECIDE" | "REROLL" | "FREE_PICK";

export type SpecialEventKind = "BLIND_VOTE" | "POWER_DRAW" | "FATE_VOTE";

export type Performance = {
  id: string;
  singers: string[];
  songId: string;
  songTitle: string;
  score: number;
  mode: KaraokeMode;
  winner?: string;
};

export type Phase =
  | "LOBBY"
  | "DRAW"
  | "RESCUE_CALL"
  | "SONG_VOTE"
  | "SINGING"
  | "DUEL_VOTE"
  | "SECRET_VOTE"
  | "POWER_DRAW"
  | "FATE_VOTE"
  | "SPECIAL_REVEAL"
  | "RESULTS";

export type SpecialReveal = {
  kind: SpecialEventKind;
  title: string;
  detail: string;
  player?: string;
  power?: PowerKind;
  forcedMode?: KaraokeMode;
  nextSinger?: string;
};

export type PublicRoomState = {
  phase: Phase;
  sequence: number;
  mode: KaraokeMode;
  players: Player[];
  currentSingers: string[];
  songOptions: Song[];
  activeSong?: Song;
  phaseEndsAt?: number;
  songVoteKey?: string;
  hype: number;
  hypeTarget: number;
  reactions: Record<ReactionKind, number>;
  partyScores: Record<string, number>;
  performances: Performance[];
  powers: Record<string, PowerKind | undefined>;
  powerSongChoices: Song[];
  powerEvent?: {
    id: string;
    player: string;
    kind: PowerKind;
    text: string;
  };
  secretVote?: {
    key: string;
    candidates: string[];
    votesCast: number;
  };
  powerDraw?: {
    key: string;
    joined: number;
  };
  fateVote?: {
    key: string;
    leftVotes: number;
    rightVotes: number;
  };
  specialReveal?: SpecialReveal;
  rescue?: {
    key: string;
    offers: string[];
  };
  duelVote?: {
    key: string;
    left: string;
    right: string;
    leftVotes: number;
    rightVotes: number;
  };
};

export type PlayerSession = {
  name: string;
  avatar: AvatarKey;
};
