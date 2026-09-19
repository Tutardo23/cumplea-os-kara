"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  LoaderCircle,
  ListMusic,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { extractYouTubeId } from "@/lib/game";
import { clearSongs, deleteSong, loadSongs, saveSong } from "@/lib/song-store";
import type { Song } from "@/types/game";

type Props = {
  songs: Song[];
  onChange: (songs: Song[]) => void;
  onClose: () => void;
};

type MetaInfo = {
  rawTitle: string;
  channel: string;
};

function makeDraft(): Song {
  return {
    id: `song-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    artist: "",
    source: { type: "youtube", videoId: "" },
  };
}

export function SongManager({ songs, onChange, onClose }: Props) {
  const [message, setMessage] = useState("");
  const [previewId, setPreviewId] = useState("");
  const [loadingMetaId, setLoadingMetaId] = useState("");
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [metaBySong, setMetaBySong] = useState<Record<string, MetaInfo>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Song | null>(null);
  const [draftMeta, setDraftMeta] = useState<MetaInfo | null>(null);
  const [draftLoadingMeta, setDraftLoadingMeta] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftPreview, setDraftPreview] = useState(false);

  const timersRef = useRef<Record<string, number>>({});
  const lastMetaVideoRef = useRef<Record<string, string>>({});
  const draftMetaTimerRef = useRef<number | null>(null);
  const lastDraftMetaVideoRef = useRef("");

  const validCount = useMemo(
    () => songs.filter((song) => song.title.trim() && /^[\w-]{11}$/.test(song.source.videoId.trim())).length,
    [songs]
  );

  const markDirty = (id: string) => setDirtyIds((prev) => new Set(prev).add(id));

  const replaceSongs = (nextSongs: Song[]) => {
    onChange(nextSongs);
  };

  const update = (id: string, recipe: (song: Song) => Song) => {
    replaceSongs(songs.map((song) => (song.id === id ? recipe(song) : song)));
    markDirty(id);
  };

  const openAddSong = () => {
    if (draftMetaTimerRef.current) window.clearTimeout(draftMetaTimerRef.current);
    lastDraftMetaVideoRef.current = "";
    setDraft(makeDraft());
    setDraftMeta(null);
    setDraftPreview(false);
    setDraftLoadingMeta(false);
    setDraftSaving(false);
    setMessage("");
    setAddOpen(true);
  };

  const closeAddSong = () => {
    if (draftSaving) return;
    if (draftMetaTimerRef.current) window.clearTimeout(draftMetaTimerRef.current);
    setAddOpen(false);
    setDraft(null);
    setDraftMeta(null);
    setDraftPreview(false);
    setDraftLoadingMeta(false);
    lastDraftMetaVideoRef.current = "";
  };

  const loadMetadata = async (id: string, input: string) => {
    const videoId = extractYouTubeId(input) || (/^[\w-]{11}$/.test(input.trim()) ? input.trim() : "");
    if (!videoId || lastMetaVideoRef.current[id] === videoId) return;

    lastMetaVideoRef.current[id] = videoId;
    setLoadingMetaId(id);
    setMessage("");

    try {
      const response = await fetch(
        `/api/youtube/meta?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as {
        error?: string;
        title?: string;
        artist?: string;
        rawTitle?: string;
        channel?: string;
      };
      if (!response.ok) throw new Error(data.error || "No pude leer ese video.");

      replaceSongs(
        songs.map((song) =>
          song.id === id
            ? {
                ...song,
                title: data.title?.trim() || song.title,
                artist: data.artist?.trim() || song.artist,
                source: { type: "youtube", videoId },
              }
            : song
        )
      );
      markDirty(id);
      setMetaBySong((prev) => ({
        ...prev,
        [id]: { rawTitle: data.rawTitle ?? "", channel: data.channel ?? "" },
      }));
    } catch (error) {
      lastMetaVideoRef.current[id] = "";
      setMessage(error instanceof Error ? error.message : "No pude leer ese video de YouTube.");
    } finally {
      setLoadingMetaId((current) => (current === id ? "" : current));
    }
  };

  const queueMetadata = (id: string, raw: string) => {
    const parsed = extractYouTubeId(raw);
    if (!parsed) return;
    if (timersRef.current[id]) window.clearTimeout(timersRef.current[id]);
    timersRef.current[id] = window.setTimeout(() => void loadMetadata(id, parsed), 420);
  };

  const loadDraftMetadata = async (input: string, force = false) => {
    if (!draft) return;
    const videoId = extractYouTubeId(input) || (/^[\w-]{11}$/.test(input.trim()) ? input.trim() : "");
    if (!videoId) return;
    if (!force && lastDraftMetaVideoRef.current === videoId) return;

    lastDraftMetaVideoRef.current = videoId;
    setDraftLoadingMeta(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/youtube/meta?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as {
        error?: string;
        title?: string;
        artist?: string;
        rawTitle?: string;
        channel?: string;
      };
      if (!response.ok) throw new Error(data.error || "No pude leer ese video.");

      setDraft((current) =>
        current
          ? {
              ...current,
              title: data.title?.trim() || current.title,
              artist: data.artist?.trim() || current.artist,
              source: { type: "youtube", videoId },
            }
          : current
      );
      setDraftMeta({ rawTitle: data.rawTitle ?? "", channel: data.channel ?? "" });
    } catch (error) {
      lastDraftMetaVideoRef.current = "";
      setMessage(error instanceof Error ? error.message : "No pude leer ese video de YouTube.");
    } finally {
      setDraftLoadingMeta(false);
    }
  };

  const queueDraftMetadata = (raw: string) => {
    const parsed = extractYouTubeId(raw);
    if (!parsed) return;
    if (draftMetaTimerRef.current) window.clearTimeout(draftMetaTimerRef.current);
    draftMetaTimerRef.current = window.setTimeout(() => void loadDraftMetadata(parsed), 420);
  };

  const persistDraft = async () => {
    if (!draft) return;

    const normalized: Song = {
      ...draft,
      title: draft.title.trim(),
      artist: draft.artist.trim(),
      source: { type: "youtube", videoId: draft.source.videoId.trim() },
    };

    if (!normalized.title) {
      setMessage("Ese tema todavía no tiene nombre.");
      return;
    }
    if (!/^[\w-]{11}$/.test(normalized.source.videoId)) {
      setMessage("Pegá una URL válida de YouTube antes de guardar.");
      return;
    }

    setDraftSaving(true);
    setMessage("");
    try {
      await saveSong(normalized);
      replaceSongs([...songs, normalized]);
      setMessage(`${normalized.title} quedó guardado al final de la biblioteca.`);
      setAddOpen(false);
      setDraft(null);
      setDraftMeta(null);
      setDraftPreview(false);
      lastDraftMetaVideoRef.current = "";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el tema.");
    } finally {
      setDraftSaving(false);
    }
  };

  const persistSong = async (song: Song) => {
    const normalized: Song = {
      ...song,
      title: song.title.trim(),
      artist: song.artist.trim(),
      source: { type: "youtube", videoId: song.source.videoId.trim() },
    };

    if (!normalized.title) {
      setMessage("Ese tema todavía no tiene nombre.");
      return;
    }
    if (!/^[\w-]{11}$/.test(normalized.source.videoId)) {
      setMessage("Pegá una URL válida de YouTube antes de guardar.");
      return;
    }

    setSavingId(song.id);
    setMessage("");
    try {
      await saveSong(normalized);
      replaceSongs(songs.map((item) => (item.id === song.id ? normalized : item)));
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
      setMessage(`${normalized.title} quedó guardado en Neon.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el tema.");
    } finally {
      setSavingId("");
    }
  };

  const removeSong = async (song: Song) => {
    if (!window.confirm(`¿Borrar "${song.title || "este tema"}" definitivamente?`)) return;

    setDeletingId(song.id);
    setMessage("");
    try {
      await deleteSong(song.id);
      const fresh = await loadSongs();
      replaceSongs(fresh);
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
      setPreviewId("");
      setMessage("Tema eliminado de Neon. No vuelve a cargarse.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo borrar el tema.");
    } finally {
      setDeletingId("");
    }
  };

  const clearLibrary = async () => {
    if (!window.confirm("¿Borrar TODOS los temas de Neon y empezar desde cero? Esta acción es definitiva.")) return;
    setMessage("");
    try {
      await clearSongs();
      const fresh = await loadSongs();
      replaceSongs(fresh);
      setDirtyIds(new Set());
      setPreviewId("");
      setMetaBySong({});
      setMessage("Biblioteca vacía en Neon. Ahora sí arrancás desde cero.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo vaciar la biblioteca.");
    }
  };

  const reload = async () => {
    setMessage("Actualizando desde Neon...");
    const fresh = await loadSongs();
    replaceSongs(fresh);
    setDirtyIds(new Set());
    setPreviewId("");
    setMessage(`Sincronizado con Neon: ${fresh.length} temas.`);
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#000615]/96 p-4 text-white backdrop-blur-xl sm:p-7">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="eyebrow">Biblioteca real de Neon</p>
            <h2 className="font-display text-5xl font-black uppercase leading-none">
              Tu <span className="text-[var(--boca-yellow)]">karaoke</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/48">
              Agregá un tema sin moverte por la lista. Se guarda en Neon y aparece al final.
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Cerrar">
            <X />
          </button>
        </header>

        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <button type="button" className="primary-button justify-center py-4" onClick={openAddSong}>
            <Plus className="h-5 w-5" /> Agregar tema
          </button>
          <a
            className="secondary-button justify-center py-4"
            href="https://www.youtube.com/results?search_query=karaoke+letra"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-5 w-5" /> Abrir YouTube
          </a>
          <button type="button" className="secondary-button justify-center py-4" onClick={() => void reload()}>
            <RefreshCw className="h-5 w-5" /> Recargar Neon
          </button>
          <button
            type="button"
            className="secondary-button justify-center py-4 text-red-200"
            onClick={() => void clearLibrary()}
          >
            <Trash2 className="h-5 w-5" /> Borrar todo
          </button>
        </div>

        {!songs.length ? (
          <button
            type="button"
            onClick={openAddSong}
            className="grid min-h-80 w-full place-items-center border border-dashed border-[var(--boca-yellow)]/25 bg-[var(--boca-yellow)]/[.035] p-8 text-center transition hover:bg-[var(--boca-yellow)]/[.06]"
          >
            <div>
              <ListMusic className="mx-auto h-12 w-12 text-[var(--boca-yellow)]" />
              <p className="font-display mt-5 text-4xl font-black uppercase">Cero temas</p>
              <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-6 text-white/45">
                Tocá acá, pegá un karaoke de YouTube, revisalo y guardalo. Cuando terminás volvés a esta biblioteca.
              </p>
            </div>
          </button>
        ) : (
          <div className="space-y-4">
            {songs.map((song, index) => {
              const videoId = song.source.videoId;
              const previewing = previewId === song.id && Boolean(videoId);
              const metadata = metaBySong[song.id];
              const loadingMeta = loadingMetaId === song.id;
              const dirty = dirtyIds.has(song.id);

              return (
                <article
                  key={song.id}
                  className={`screen-card overflow-hidden border-t-4 p-5 sm:p-6 ${
                    dirty ? "border-t-white/25" : "border-t-[var(--boca-yellow)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center border border-white/10 bg-white/4 font-display text-2xl font-black text-[var(--boca-yellow)]">
                        {index + 1}
                      </div>
                      <span
                        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] ${
                          dirty ? "text-white/45" : "text-[var(--boca-yellow)]"
                        }`}
                      >
                        {dirty ? (
                          "Sin guardar"
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" /> Guardado
                          </>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === song.id}
                      className="icon-button text-red-200 disabled:opacity-40"
                      onClick={() => void removeSong(song)}
                      title="Eliminar definitivamente"
                    >
                      {deletingId === song.id ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                    <label className="field-label">
                      URL del karaoke en YouTube
                      <input
                        className="field"
                        value={videoId}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const parsed = extractYouTubeId(raw);
                          update(song.id, (item) => ({
                            ...item,
                            source: { type: "youtube", videoId: parsed || raw.trim() },
                          }));
                          setMessage("");
                          queueMetadata(song.id, raw);
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData("text");
                          window.setTimeout(() => queueMetadata(song.id, pasted), 0);
                        }}
                        onBlur={(e) => void loadMetadata(song.id, e.currentTarget.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      <span className="mt-2 flex min-h-4 items-center gap-2 text-[10px] font-semibold normal-case tracking-normal text-white/35">
                        {loadingMeta ? (
                          <>
                            <LoaderCircle className="h-3 w-3 animate-spin" /> Leyendo datos del video...
                          </>
                        ) : (
                          "Pegá el link y completa los campos automáticamente."
                        )}
                      </span>
                    </label>
                    <button
                      type="button"
                      disabled={!videoId || loadingMeta}
                      className="secondary-button justify-center disabled:opacity-30"
                      onClick={() => {
                        lastMetaVideoRef.current[song.id] = "";
                        void loadMetadata(song.id, videoId);
                      }}
                    >
                      <RefreshCw className="h-5 w-5" /> Detectar datos
                    </button>
                    <button
                      type="button"
                      disabled={!/^[\w-]{11}$/.test(videoId)}
                      className="secondary-button justify-center disabled:opacity-30"
                      onClick={() => setPreviewId(previewing ? "" : song.id)}
                    >
                      <Video className="h-5 w-5" /> {previewing ? "Cerrar prueba" : "Probar video"}
                    </button>
                  </div>

                  {metadata && (
                    <div className="mt-3 border-l-2 border-[var(--boca-yellow)]/50 bg-[var(--boca-yellow)]/[.04] px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[.15em] text-[var(--boca-yellow)]">Detectado en YouTube</p>
                      <p className="mt-1 text-sm font-bold text-white/70">{metadata.rawTitle}</p>
                      {metadata.channel && <p className="mt-1 text-xs font-semibold text-white/35">Canal: {metadata.channel}</p>}
                    </div>
                  )}

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label className="field-label">
                      Tema
                      <input
                        className="field"
                        value={song.title}
                        onChange={(e) => update(song.id, (item) => ({ ...item, title: e.target.value }))}
                        placeholder="Se completa desde YouTube"
                      />
                    </label>
                    <label className="field-label">
                      Artista
                      <input
                        className="field"
                        value={song.artist}
                        onChange={(e) => update(song.id, (item) => ({ ...item, artist: e.target.value }))}
                        placeholder="Se intenta detectar automáticamente"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-3">
                    <a
                      className="secondary-button justify-center"
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                        `${song.title || "tema"} ${song.artist || ""} karaoke letra`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-5 w-5" /> Buscar otra versión
                    </a>
                    <button
                      type="button"
                      disabled={savingId === song.id || loadingMeta}
                      className="primary-button justify-center disabled:opacity-40"
                      onClick={() => void persistSong(song)}
                    >
                      {savingId === song.id ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Guardar tema
                    </button>
                  </div>

                  {previewing && (
                    <div className="mt-4 aspect-video overflow-hidden border border-white/10 bg-black">
                      <iframe
                        className="h-full w-full"
                        src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0`}
                        title={`Prueba de ${song.title || "karaoke"}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <footer className="sticky bottom-3 mt-6 flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-[#00113b]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-white/35">Biblioteca activa</p>
            <p className="font-display text-3xl font-black text-[var(--boca-yellow)]">{validCount} temas</p>
            {message && <p className="mt-1 text-xs font-semibold text-white/55">{message}</p>}
          </div>
          <p className="max-w-md text-right text-xs font-semibold leading-5 text-white/35">
            Agregar abre una vista aparte. Guardás, se cierra sola y el tema aparece al final.
          </p>
        </footer>
      </div>

      {addOpen && draft && (
        <div className="fixed inset-0 z-[180] overflow-y-auto bg-[#00030b]/96 p-4 backdrop-blur-xl sm:p-7">
          <div className="mx-auto max-w-5xl">
            <header className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="eyebrow">Nuevo tema</p>
                <h3 className="font-display text-5xl font-black uppercase leading-none">
                  Agregar <span className="text-[var(--boca-yellow)]">karaoke</span>
                </h3>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/48">
                  Pegá el enlace, comprobá que sea la versión correcta y guardá. Después volvés automáticamente a la biblioteca.
                </p>
              </div>
              <button type="button" className="icon-button" onClick={closeAddSong} title="Cancelar">
                <X />
              </button>
            </header>

            <div className="screen-card overflow-hidden border-t-4 border-t-[var(--boca-yellow)] p-5 sm:p-7">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                <label className="field-label">
                  URL del karaoke en YouTube
                  <input
                    autoFocus
                    className="field"
                    value={draft.source.videoId}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = extractYouTubeId(raw);
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              source: { type: "youtube", videoId: parsed || raw.trim() },
                            }
                          : current
                      );
                      setDraftMeta(null);
                      setDraftPreview(false);
                      setMessage("");
                      queueDraftMetadata(raw);
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      window.setTimeout(() => queueDraftMetadata(pasted), 0);
                    }}
                    onBlur={(e) => void loadDraftMetadata(e.currentTarget.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  <span className="mt-2 flex min-h-4 items-center gap-2 text-[10px] font-semibold normal-case tracking-normal text-white/35">
                    {draftLoadingMeta ? (
                      <>
                        <LoaderCircle className="h-3 w-3 animate-spin" /> Leyendo nombre y artista del video...
                      </>
                    ) : (
                      "Pegá el link. El nombre y el artista se intentan completar solos."
                    )}
                  </span>
                </label>

                <button
                  type="button"
                  disabled={!draft.source.videoId || draftLoadingMeta}
                  className="secondary-button justify-center disabled:opacity-30"
                  onClick={() => {
                    lastDraftMetaVideoRef.current = "";
                    void loadDraftMetadata(draft.source.videoId, true);
                  }}
                >
                  <RefreshCw className="h-5 w-5" /> Detectar datos
                </button>

                <button
                  type="button"
                  disabled={!/^[\w-]{11}$/.test(draft.source.videoId)}
                  className="secondary-button justify-center disabled:opacity-30"
                  onClick={() => setDraftPreview((current) => !current)}
                >
                  <Video className="h-5 w-5" /> {draftPreview ? "Cerrar prueba" : "Probar video"}
                </button>
              </div>

              {draftMeta && (
                <div className="mt-4 border-l-2 border-[var(--boca-yellow)]/50 bg-[var(--boca-yellow)]/[.04] px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[.15em] text-[var(--boca-yellow)]">Detectado en YouTube</p>
                  <p className="mt-1 text-sm font-bold text-white/70">{draftMeta.rawTitle}</p>
                  {draftMeta.channel && <p className="mt-1 text-xs font-semibold text-white/35">Canal: {draftMeta.channel}</p>}
                </div>
              )}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <label className="field-label">
                  Tema
                  <input
                    className="field"
                    value={draft.title}
                    onChange={(e) => setDraft((current) => (current ? { ...current, title: e.target.value } : current))}
                    placeholder="Se completa desde YouTube"
                  />
                </label>
                <label className="field-label">
                  Artista
                  <input
                    className="field"
                    value={draft.artist}
                    onChange={(e) => setDraft((current) => (current ? { ...current, artist: e.target.value } : current))}
                    placeholder="Se intenta detectar automáticamente"
                  />
                </label>
              </div>

              {draftPreview && /^[\w-]{11}$/.test(draft.source.videoId) && (
                <div className="mt-5 aspect-video overflow-hidden border border-white/10 bg-black">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${encodeURIComponent(draft.source.videoId)}?rel=0`}
                    title={`Prueba de ${draft.title || "karaoke"}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}

              {message && <p className="mt-4 text-sm font-semibold text-white/55">{message}</p>}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <a
                  className="secondary-button justify-center"
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                    `${draft.title || "tema"} ${draft.artist || ""} karaoke letra`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-5 w-5" /> Buscar en YouTube
                </a>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" className="secondary-button justify-center" onClick={closeAddSong} disabled={draftSaving}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="primary-button justify-center disabled:opacity-40"
                    onClick={() => void persistDraft()}
                    disabled={draftSaving || draftLoadingMeta}
                  >
                    {draftSaving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Guardar y volver
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
