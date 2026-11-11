-- Voyages : un budget à part, financé par l'épargne. Les opérations rattachées
-- à un voyage sortent des plafonds mensuels et comptent dans le budget du voyage.
create table public.budget_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  starts_on date,
  ends_on date,
  budget numeric not null default 0 check (budget >= 0),
  created_at timestamptz not null default now()
);

create index budget_trips_user_idx on public.budget_trips (user_id);

alter table public.budget_trips enable row level security;
create policy "owner" on public.budget_trips for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.budget_transactions
  add column trip_id uuid references public.budget_trips (id) on delete set null;

create index budget_transactions_trip_idx on public.budget_transactions (trip_id);
