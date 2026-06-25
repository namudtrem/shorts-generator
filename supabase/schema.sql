-- ============================================================
-- YouTube Shorts Generator — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL -> New query)
-- ============================================================

-- A row per video generation job.
create table if not exists public.videos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete cascade,
  topic         text not null,
  genre         text not null default 'story',
  status        text not null default 'pending',
    -- pending | writing | voicing | imaging | rendering | done | error
  error         text,

  -- pipeline artifacts
  script        text,            -- the full narration text
  title         text,            -- suggested YouTube title
  description   text,            -- suggested description + hashtags
  audio_url     text,            -- ElevenLabs voiceover (stored in Supabase Storage)
  image_urls    jsonb default '[]'::jsonb,  -- AI background images
  render_id     text,            -- Creatomate render id
  video_url     text,            -- final rendered .mp4

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists videos_user_id_idx on public.videos (user_id);
create index if not exists videos_status_idx on public.videos (status);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security: users only see their own videos.
-- The server (service role key) bypasses RLS for the pipeline.
-- ============================================================
alter table public.videos enable row level security;

drop policy if exists "own videos - select" on public.videos;
create policy "own videos - select" on public.videos
  for select using (auth.uid() = user_id);

drop policy if exists "own videos - insert" on public.videos;
create policy "own videos - insert" on public.videos
  for insert with check (auth.uid() = user_id);

drop policy if exists "own videos - update" on public.videos;
create policy "own videos - update" on public.videos
  for update using (auth.uid() = user_id);

drop policy if exists "own videos - delete" on public.videos;
create policy "own videos - delete" on public.videos
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Storage bucket for generated audio/images.
-- (Creatomate fetches these by URL, so the bucket must be public-read.)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
