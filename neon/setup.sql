create table if not exists karaoke_songs (
  id text primary key,
  title text not null,
  artist text not null default '',
  source_type text not null default 'youtube' check (source_type in ('youtube', 'audio')),
  youtube_id text,
  audio_url text,
  lyrics_lrc text,
  vocal_reduction boolean not null default false,
  visual_youtube_id text,
  visual_offset double precision not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists party_rooms (
  room_code text primary key,
  state jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists party_players (
  room_code text not null,
  name text not null,
  avatar text not null default 'star',
  last_seen timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (room_code, name)
);

create table if not exists party_events (
  id bigserial primary key,
  room_code text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists party_events_room_id_idx on party_events (room_code, id);
create index if not exists party_players_room_seen_idx on party_players (room_code, last_seen desc);

-- The party is ephemeral. Keeping the last few thousand events is enough for realtime fan-out.
-- You can clear rooms/events after the birthday without affecting the song library.

-- Safe upgrade for databases created before the optional visual YouTube layer existed.
alter table karaoke_songs add column if not exists visual_youtube_id text;
alter table karaoke_songs add column if not exists visual_offset double precision not null default 0;
