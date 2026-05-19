export interface Song {
  id: string;
  title: string;
  artist: string;
  youtubeId: string; // El ID que va después de watch?v=
}

export const karaokeSongs: Song[] = [
  { id: "1", title: "De Música Ligera", artist: "Soda Stereo", youtubeId: "X5iGNQN_Ijg" },
  { id: "2", title: "La Bachata", artist: "Manuel Turizo", youtubeId: "tLPUmT6s8O8" },
  { id: "3", title: "Tusa", artist: "Karol G & Nicki Minaj", youtubeId: "zGL6g6_6GUM" },
  // Agregás las que quieras...
];