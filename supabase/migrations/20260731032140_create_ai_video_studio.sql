create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paid_generation_enabled boolean not null default false,
  max_daily_budget_usd numeric(10, 4) not null default 2.0000
    check (max_daily_budget_usd >= 0 and max_daily_budget_usd <= 1000),
  max_single_job_budget_usd numeric(10, 4) not null default 0.5000
    check (max_single_job_budget_usd >= 0 and max_single_job_budget_usd <= 100),
  disclosure_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  topic text not null check (char_length(topic) between 1 and 2000),
  mode text not null default 'manual'
    check (mode in ('manual', 'google', 'local')),
  platform text not null default 'shorts'
    check (platform in ('youtube', 'shorts', 'square')),
  aspect_ratio text not null default '9:16'
    check (aspect_ratio in ('16:9', '9:16', '1:1')),
  duration_seconds integer not null default 15
    check (duration_seconds between 3 and 600),
  visual_style text,
  language text not null default 'ko',
  status text not null default 'draft'
    check (status in ('draft', 'generating', 'review', 'complete', 'error', 'archived')),
  prompt_ko text,
  prompt_en text,
  prompt_json jsonb not null default '{}'::jsonb,
  actual_cost_usd numeric(10, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position between 1 and 1000),
  duration_seconds numeric(6, 2) not null check (duration_seconds > 0 and duration_seconds <= 10),
  title text not null check (char_length(title) between 1 and 120),
  visual_description text not null,
  identity_anchors text,
  action_motion text,
  camera text,
  composition text,
  lighting_mood text,
  narration text,
  audio_cues text,
  negative_constraints text,
  transition text,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'generating', 'review', 'accepted', 'rejected', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, position)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null
    check (kind in ('reference_image', 'source_video', 'generated_video', 'audio', 'subtitle', 'thumbnail', 'export')),
  bucket_id text not null default 'media',
  object_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 52428800),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_seconds numeric(10, 3) check (duration_seconds is null or duration_seconds >= 0),
  license_confirmed boolean not null default false,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (bucket_id, object_path)
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gemini-omni', 'veo', 'manual', 'mock')),
  model text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'canceled')),
  prompt text not null check (char_length(prompt) between 10 and 8000),
  aspect_ratio text not null check (aspect_ratio in ('16:9', '9:16')),
  duration_seconds integer not null check (duration_seconds between 3 and 10),
  estimated_cost_usd numeric(10, 4) not null default 0 check (estimated_cost_usd >= 0),
  actual_cost_usd numeric(10, 4) check (actual_cost_usd is null or actual_cost_usd >= 0),
  billable_confirmed boolean not null default false,
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 128),
  provider_job_id text,
  previous_interaction_id text,
  output_asset_id uuid references public.assets(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (user_id, idempotency_key)
);

create index projects_user_updated_idx on public.projects (user_id, updated_at desc);
create index shots_project_position_idx on public.shots (project_id, position);
create index shots_user_idx on public.shots (user_id);
create index assets_project_created_idx on public.assets (project_id, created_at desc);
create index assets_user_idx on public.assets (user_id);
create index generation_jobs_project_created_idx on public.generation_jobs (project_id, created_at desc);
create index generation_jobs_user_daily_idx on public.generation_jobs (user_id, created_at desc);
create index generation_jobs_output_asset_idx on public.generation_jobs (output_asset_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger shots_set_updated_at
before update on public.shots
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.projects enable row level security;
alter table public.shots enable row level security;
alter table public.assets enable row level security;
alter table public.generation_jobs enable row level security;

create policy profiles_select_own on public.profiles
for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles
for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy settings_select_own on public.user_settings
for select to authenticated using ((select auth.uid()) = user_id);
create policy settings_insert_own on public.user_settings
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy settings_update_own on public.user_settings
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy projects_select_own on public.projects
for select to authenticated using ((select auth.uid()) = user_id);
create policy projects_insert_own on public.projects
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy projects_update_own on public.projects
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy projects_delete_own on public.projects
for delete to authenticated using ((select auth.uid()) = user_id);

create policy shots_select_own on public.shots
for select to authenticated using ((select auth.uid()) = user_id);
create policy shots_insert_own on public.shots
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  )
);
create policy shots_update_own on public.shots
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  )
);
create policy shots_delete_own on public.shots
for delete to authenticated using ((select auth.uid()) = user_id);

create policy assets_select_own on public.assets
for select to authenticated using ((select auth.uid()) = user_id);
create policy assets_insert_own on public.assets
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and license_confirmed
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = (select auth.uid())
    )
  )
);
create policy assets_update_own on public.assets
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy assets_delete_own on public.assets
for delete to authenticated using ((select auth.uid()) = user_id);

create policy jobs_select_own on public.generation_jobs
for select to authenticated using ((select auth.uid()) = user_id);
create policy jobs_insert_own on public.generation_jobs
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  )
);
create policy jobs_update_own on public.generation_jobs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function private.reserve_generation_job(
  p_project_id uuid,
  p_idempotency_key text,
  p_estimated_cost numeric,
  p_model text,
  p_prompt text,
  p_aspect_ratio text,
  p_duration_seconds integer
)
returns public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_settings public.user_settings;
  v_daily_reserved numeric(10, 4);
  v_existing public.generation_jobs;
  v_job public.generation_jobs;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_existing
  from public.generation_jobs
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.project_id <> p_project_id
      or v_existing.estimated_cost_usd <> p_estimated_cost
      or v_existing.model <> p_model
      or v_existing.prompt <> p_prompt
      or v_existing.aspect_ratio <> p_aspect_ratio
      or v_existing.duration_seconds <> p_duration_seconds
    then
      raise exception 'Idempotency key was already used for a different request';
    end if;
    return v_existing;
  end if;

  insert into public.user_settings (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select * into v_settings
  from public.user_settings
  where user_id = v_user_id
  for update;

  if not v_settings.paid_generation_enabled then
    raise exception 'Paid generation is disabled';
  end if;
  if p_estimated_cost < 0 or p_estimated_cost > v_settings.max_single_job_budget_usd then
    raise exception 'Single job budget exceeded';
  end if;
  if not exists (
    select 1 from public.projects
    where id = p_project_id and user_id = v_user_id
  ) then
    raise exception 'Project not found';
  end if;

  select coalesce(sum(coalesce(actual_cost_usd, estimated_cost_usd)), 0)
  into v_daily_reserved
  from public.generation_jobs
  where user_id = v_user_id
    and status <> 'canceled'
    and created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';

  if v_daily_reserved + p_estimated_cost > v_settings.max_daily_budget_usd then
    raise exception 'Daily budget exceeded';
  end if;

  insert into public.generation_jobs (
    project_id, user_id, provider, model, status, prompt, aspect_ratio,
    duration_seconds, estimated_cost_usd, billable_confirmed, idempotency_key
  )
  values (
    p_project_id, v_user_id, 'gemini-omni', p_model, 'queued', p_prompt,
    p_aspect_ratio, p_duration_seconds, p_estimated_cost, true, p_idempotency_key
  )
  returning * into v_job;

  return v_job;
end;
$$;

revoke all on function private.reserve_generation_job(uuid, text, numeric, text, text, text, integer)
from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.reserve_generation_job(uuid, text, numeric, text, text, text, integer)
to authenticated;

create or replace function private.start_generation_job(p_job_id uuid)
returns public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.generation_jobs;
begin
  update public.generation_jobs
  set status = 'running', started_at = coalesce(started_at, now())
  where id = p_job_id
    and user_id = (select auth.uid())
    and status = 'queued'
  returning * into v_job;
  if not found then raise exception 'Generation job cannot be started'; end if;
  return v_job;
end;
$$;

create or replace function private.finish_generation_job(
  p_job_id uuid,
  p_asset_id uuid,
  p_provider_job_id text
)
returns public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.generation_jobs;
begin
  update public.generation_jobs as job
  set status = 'completed',
      provider_job_id = left(p_provider_job_id, 500),
      output_asset_id = p_asset_id,
      actual_cost_usd = estimated_cost_usd,
      completed_at = now()
  where job.id = p_job_id
    and job.user_id = (select auth.uid())
    and job.status = 'running'
    and exists (
      select 1 from public.assets a
      where a.id = p_asset_id
        and a.user_id = (select auth.uid())
        and a.project_id = job.project_id
    )
  returning * into v_job;
  if not found then raise exception 'Generation job cannot be completed'; end if;
  return v_job;
end;
$$;

create or replace function private.stop_generation_job(
  p_job_id uuid,
  p_status text,
  p_error_message text
)
returns public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.generation_jobs;
begin
  if p_status not in ('failed', 'canceled') then
    raise exception 'Invalid terminal status';
  end if;
  update public.generation_jobs
  set status = p_status,
      error_message = left(coalesce(p_error_message, 'Generation stopped'), 500),
      completed_at = now()
  where id = p_job_id
    and user_id = (select auth.uid())
    and status in ('queued', 'running')
  returning * into v_job;
  if not found then raise exception 'Generation job cannot be stopped'; end if;
  return v_job;
end;
$$;

revoke all on function private.start_generation_job(uuid) from public, anon;
revoke all on function private.finish_generation_job(uuid, uuid, text) from public, anon;
revoke all on function private.stop_generation_job(uuid, text, text) from public, anon;
grant execute on function private.start_generation_job(uuid) to authenticated;
grant execute on function private.finish_generation_job(uuid, uuid, text) to authenticated;
grant execute on function private.stop_generation_job(uuid, text, text) to authenticated;

create or replace function public.reserve_generation_job(
  p_project_id uuid,
  p_idempotency_key text,
  p_estimated_cost numeric,
  p_model text,
  p_prompt text,
  p_aspect_ratio text,
  p_duration_seconds integer
)
returns public.generation_jobs
language sql
security invoker
set search_path = ''
as $$
  select private.reserve_generation_job(
    p_project_id,
    p_idempotency_key,
    p_estimated_cost,
    p_model,
    p_prompt,
    p_aspect_ratio,
    p_duration_seconds
  );
$$;

create or replace function public.start_generation_job(p_job_id uuid)
returns public.generation_jobs
language sql
security invoker
set search_path = ''
as $$ select private.start_generation_job(p_job_id); $$;

create or replace function public.finish_generation_job(
  p_job_id uuid,
  p_asset_id uuid,
  p_provider_job_id text
)
returns public.generation_jobs
language sql
security invoker
set search_path = ''
as $$ select private.finish_generation_job(p_job_id, p_asset_id, p_provider_job_id); $$;

create or replace function public.stop_generation_job(
  p_job_id uuid,
  p_status text,
  p_error_message text
)
returns public.generation_jobs
language sql
security invoker
set search_path = ''
as $$ select private.stop_generation_job(p_job_id, p_status, p_error_message); $$;

revoke all on function public.reserve_generation_job(uuid, text, numeric, text, text, text, integer)
from public, anon;
revoke all on function public.start_generation_job(uuid) from public, anon;
revoke all on function public.finish_generation_job(uuid, uuid, text) from public, anon;
revoke all on function public.stop_generation_job(uuid, text, text) from public, anon;
grant execute on function public.reserve_generation_job(uuid, text, numeric, text, text, text, integer)
to authenticated;
grant execute on function public.start_generation_job(uuid) to authenticated;
grant execute on function public.finish_generation_job(uuid, uuid, text) to authenticated;
grant execute on function public.stop_generation_job(uuid, text, text) to authenticated;

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles, public.user_settings to authenticated;
grant select, insert, update, delete on public.projects, public.shots, public.assets to authenticated;
grant select on public.generation_jobs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/mp4',
    'text/vtt', 'application/x-subrip'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy media_select_own on storage.objects
for select to authenticated using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy media_insert_own on storage.objects
for insert to authenticated with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy media_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy media_delete_own on storage.objects
for delete to authenticated using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
