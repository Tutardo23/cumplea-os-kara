alter table karaoke_songs
  add column if not exists visual_youtube_id text;

alter table karaoke_songs
  add column if not exists visual_offset double precision not null default 0;
