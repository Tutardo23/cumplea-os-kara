# Machi's Night

Rebuild del proyecto `cumplea-os-kara` para el cumpleaños de Machi.

La idea dejó de ser una secuencia rígida de karaoke. Ahora la pantalla principal funciona como director del show y cada teléfono cambia de interfaz según el momento.

## Qué cambió

- Identidad visual azul y oro, inspirada en los colores de Boca, sin usar el escudo ni assets oficiales.
- Sin emojis en la interfaz: todos los símbolos son de `lucide-react`.
- Un único canal Supabase Realtime por dispositivo durante toda la sesión.
- Presence para mostrar quién está realmente conectado.
- Teléfono protagonista durante toda la noche.
- Votaciones cortas con countdown.
- Hype Meter durante el karaoke.
- Reacciones en vivo durante canciones.
- `Tap Rush`, un microjuego de 7 segundos basado completamente en el teléfono.
- `Mayoría`, votaciones rápidas sin respuesta correcta.
- Party Ranking acumulado.
- Selección más justa de cantantes para evitar repeticiones.
- Dúos automáticos cada pocos turnos cuando hay suficientes jugadores.
- Editor de canciones rediseñado.
- Borrado real de canciones en Supabase.
- Dos motores de karaoke:
  1. YouTube.
  2. Audio propio + letra sincronizada LRC.
- Reducción de voz experimental para audio estéreo propio.
- Subida de audio a Supabase Storage.
- Importación de archivos `.lrc`.
- Route Handler preparado para búsqueda de YouTube mediante API key.

## Instalación

```bash
npm install
npm run dev
```

Crear `.env.local` tomando `.env.example` como base:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
YOUTUBE_API_KEY=... # opcional
```

Después ejecutar `supabase/setup.sql` en el SQL Editor del proyecto Supabase.

## Rutas

- `/` crea o permite entrar a una sala.
- `/:roomCode/screen` es la pantalla principal / host.
- `/:roomCode/play` es el control móvil.

## Cómo funciona la noche

El host puede arrancar con `Sorpresa siguiente`. El motor alterna karaoke y microjuegos para no repetir siempre la misma secuencia.

### Karaoke

1. Spotlight elige cantante o dúo.
2. Todos votan entre dos canciones durante 8 segundos.
3. Empieza el karaoke.
4. Los teléfonos muestran Hype + reacciones.
5. Al terminar, todos puntúan Actitud, Energía y Voz durante 8 segundos.
6. Los cantantes reciben puntos para el Party Ranking.

### Tap Rush

Durante 7 segundos, toda la pantalla del teléfono es un botón. Los tres mejores reciben 250, 150 y 100 puntos.

### Mayoría

Pregunta rápida de dos opciones, sin respuesta correcta. Está pensada para cortar el karaoke con una interacción de pocos segundos y generar reacción en el grupo.

## Karaoke sin video específico de YouTube

En `Karaoke Lab`, una canción puede cambiar de fuente a `Audio + letra`.

Se puede:

- pegar una URL de audio;
- subir un MP3/M4A/WAV al bucket `karaoke-assets`;
- pegar una letra LRC;
- importar un archivo `.lrc`;
- activar reducción de voz experimental.

Formato LRC básico:

```text
[00:12.50]Primera línea
[00:17.20]Segunda línea
[00:21.80]Tercera línea
```

El reproductor resalta automáticamente la línea correspondiente y muestra anterior/actual/siguiente.

### Sobre la reducción de voz

No es separación de stems con IA. Usa cancelación del canal central mediante Web Audio, por lo que funciona mejor cuando la voz principal está centrada en una mezcla estéreo. En algunas canciones puede bajar también instrumentos centrales o no quitar suficientemente la voz.

Para una calidad profesional, lo ideal es cargar directamente una pista instrumental o un stem del que se tengan derechos de uso.

## YouTube

El modo YouTube sigue disponible para karaoke ya publicado. El editor incluye un enlace de búsqueda rápida. También existe `/api/youtube/search?q=...` si configurás `YOUTUBE_API_KEY`.

No se descarga ni extrae audio de YouTube.

## Importante antes de la fiesta

Probar en la misma red/Wi-Fi y con datos móviles al menos:

- entrada por QR;
- 4 o más celulares a la vez;
- votación de canción;
- Hype Meter;
- Tap Rush;
- audio personalizado desde Supabase Storage;
- video YouTube en la TV/proyector;
- autoplay del navegador.

Los navegadores pueden bloquear autoplay sin una interacción previa. Conviene iniciar la sala y tocar una vez la pantalla principal antes del primer tema.

## Seguridad

El setup incluido prioriza facilidad para una fiesta privada y permite escritura anónima sobre la biblioteca musical y el bucket. Para reutilizarlo públicamente, conviene proteger la administración con autenticación o un PIN y endurecer las políticas RLS.
