# Machi's Night — parche Neon

Este ZIP es un parche incremental. Contiene únicamente archivos nuevos o modificados respecto de `MACHI v2`.

## Qué cambia

- Supabase deja de usarse por completo.
- Lakebase Postgres en Neon guarda canciones, estado de sala, participantes y el bus durable de eventos.
- Una Neon Function (`machiparty`) mantiene el WebSocket usado por la TV y los celulares.
- Neon Object Storage (`karaoke-assets`) guarda los audios propios del Karaoke Lab.
- El frontend sigue alojado en Vercel.

## 1. Copiar el parche

Copiá el contenido de este ZIP sobre la raíz del proyecto existente, respetando las rutas.

Luego borrá los archivos indicados en `DELETE_FILES.txt`.

## 2. Instalar dependencias

```bash
npm install
```

## 3. Vincular el proyecto con Neon

Instalá/actualizá la CLI de Neon y autenticá tu cuenta si todavía no lo hiciste.

```bash
npm i -g neon
neon link
```

`neon.ts` declara la Function y el bucket de audio.

Aplicá la infraestructura:

```bash
neon deploy
```

Esto despliega `functions/party.ts` y crea el bucket público `karaoke-assets`.

## 4. Crear las tablas

Ejecutá `neon/setup.sql` una sola vez contra la base elegida. Para migraciones conviene usar la URL directa/no pooled.

El script crea:

- `karaoke_songs`
- `party_rooms`
- `party_players`
- `party_events`

No intenta conservar ninguna tabla de Supabase.

## 5. Obtener la URL de la Function

Después del deploy, consultá la Neon Function `machiparty` y copiá su invocation URL.

En Vercel agregá:

```env
NEXT_PUBLIC_NEON_PARTY_FUNCTION_URL=https://TU-FUNCTION-DE-NEON
```

La misma variable puede ir en `.env.local` para desarrollo.

La app deriva automáticamente `wss://.../ws` desde esa URL para el WebSocket.

## 6. YouTube opcional

Si querés mantener la búsqueda desde Karaoke Lab:

```env
YOUTUBE_API_KEY=...
```

No hace falta para reproducir IDs/URLs de YouTube ya cargados ni para usar audio + LRC.

## 7. Desarrollo local

Para que las Neon Functions reciban sus variables de Postgres/Object Storage:

```bash
neon env pull
neon dev
```

En otra terminal:

```bash
npm run dev
```

Asegurate de que `NEXT_PUBLIC_NEON_PARTY_FUNCTION_URL` apunte a la Function que estás usando para la prueba.

## Realtime

No hay polling por cada teléfono contra Postgres.

Cada navegador mantiene un WebSocket con la Neon Function. La Function hace fan-out local y sincroniza distintas instancias mediante `party_events` en Postgres con un cursor corto. El host sigue siendo quien calcula el juego; Neon conserva el estado compartido y el canal durable.

Los teléfonos envían Hype/Tap en lotes para no generar una escritura por cada toque.

## Audio del Karaoke Lab

La Function genera una URL firmada de subida. El navegador manda el archivo directamente a Neon Object Storage; el audio no atraviesa Vercel ni queda guardado dentro de Postgres.

La URL pública final se guarda en `karaoke_songs.audio_url`.
