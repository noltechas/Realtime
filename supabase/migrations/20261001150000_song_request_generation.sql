-- Auto-generation status for guest song requests.
--
-- When a guest requests a song the library doesn't have, the host's desktop
-- app generates it automatically (YouTube Music audio → local vocal
-- separation → import → Claude tuning pass) and mirrors its progress here so
-- the companion website and mobile app can show "Generating… 40%" live.
--
-- `status` keeps its meaning (pending → added | dismissed); these columns only
-- describe the generator's run for a still-pending request. NULL
-- generation_status = no run started (auto-generation off, or a request made
-- before this feature).

alter table public.karaoke_song_requests
  add column if not exists generation_status text,
  add column if not exists generation_progress smallint,
  add column if not exists generation_error text,
  add column if not exists generation_updated_at timestamptz;

alter table public.karaoke_song_requests
  drop constraint if exists karaoke_song_requests_generation_status_check;
alter table public.karaoke_song_requests
  add constraint karaoke_song_requests_generation_status_check
  check (generation_status is null or generation_status in
    ('queued', 'downloading', 'separating', 'importing', 'tuning', 'ready', 'failed'));

alter table public.karaoke_song_requests
  drop constraint if exists karaoke_song_requests_generation_progress_check;
alter table public.karaoke_song_requests
  add constraint karaoke_song_requests_generation_progress_check
  check (generation_progress is null or generation_progress between 0 and 100);
