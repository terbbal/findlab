-- finD Lab: one row of personal data per signed-in student, protected by row-level security.
-- Run this once in Supabase → SQL Editor → New query → Run.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- Each student can only see and change their own row,
-- and only with a @dgist.ac.kr account (the app also checks this before sending the login link).
drop policy if exists "own row" on public.user_data;
create policy "own row" on public.user_data
  for all
  using (auth.uid() = user_id and (auth.jwt() ->> 'email') like '%@dgist.ac.kr')
  with check (auth.uid() = user_id and (auth.jwt() ->> 'email') like '%@dgist.ac.kr');
