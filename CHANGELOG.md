# Machi's Night v2 - cambios principales

## Experiencia

- Rediseño completo azul y oro.
- Teléfono como controlador contextual durante toda la noche.
- Flujo rápido con fases temporizadas.
- Motor de variedad para evitar secuencias predecibles.
- Spotlight con suspenso para elegir cantantes.
- Dúos automáticos periódicos.
- Canción sorpresa cada cuatro turnos de karaoke.
- Party Ranking acumulado.

## Interacciones móviles

- Voto de canción.
- Hype Meter con envío por lotes para no saturar Realtime.
- Reacciones en vivo con iconos Lucide.
- Jurado rápido por categorías.
- Tap Rush.
- Mayoría.
- Vibración cuando el navegador/dispositivo la soporta.

## Karaoke

- Reproductor YouTube.
- Reproductor propio para audio.
- Letras sincronizadas LRC.
- Importación de archivos LRC.
- Upload de audio a Supabase Storage.
- Reducción de voz estéreo experimental con Web Audio.
- Búsqueda YouTube opcional mediante Route Handler y API key.

## Arquitectura

- Componentes separados para avatar, countdown, spotlight y karaoke.
- Tipos de juego centralizados.
- Capa de persistencia de canciones.
- Canal Realtime estable por dispositivo.
- Presence para estado online.
- Broadcast para acciones rápidas.
- Persistencia local del host entre recargas.
- Eliminación real de canciones en Supabase.
