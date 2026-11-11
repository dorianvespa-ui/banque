-- Schéma initial du tableau de bord budget.
-- Chaque ligne appartient à un utilisateur ; la sécurité au niveau des lignes (RLS)
-- garantit qu'on ne lit et n'écrit que ses propres données.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bank text not null,
  name text not null,
  kind text not null check (kind in ('courant', 'epargne', 'placement')),
  -- Budget auquel le compte participe ; null = suivi du patrimoine uniquement.
  budget_scope text check (budget_scope in ('perso', 'joint')),
  -- Part du solde qui m'appartient (0.5 pour un compte joint à deux).
  share numeric not null default 1 check (share > 0 and share <= 1),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('depense', 'revenu')),
  sort integer not null default 0,
  unique (user_id, name)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scope text not null check (scope in ('perso', 'joint')),
  category_id uuid not null references public.categories (id) on delete cascade,
  monthly_limit numeric not null check (monthly_limit >= 0),
  unique (user_id, scope, category_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  booked_on date not null,
  amount numeric not null,
  label text not null,
  category_id uuid references public.categories (id) on delete set null,
  -- Virement entre mes propres comptes : exclu des budgets.
  is_transfer boolean not null default false,
  -- Identifiant stable servant à ne pas importer deux fois la même opération.
  external_id text not null,
  created_at timestamptz not null default now(),
  unique (account_id, external_id)
);

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Texte recherché dans le libellé (sans tenir compte de la casse).
  pattern text not null,
  category_id uuid references public.categories (id) on delete cascade,
  is_transfer boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  as_of date not null,
  amount numeric not null,
  unique (account_id, as_of)
);

create index accounts_user_idx on public.accounts (user_id);
create index budgets_category_idx on public.budgets (category_id);
create index transactions_user_date_idx on public.transactions (user_id, booked_on desc);
create index transactions_category_idx on public.transactions (category_id);
create index rules_user_idx on public.rules (user_id);
create index rules_category_idx on public.rules (category_id);
create index balances_user_idx on public.balances (user_id);

do $$
declare
  t text;
begin
  foreach t in array array['accounts', 'categories', 'budgets', 'transactions', 'rules', 'balances']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "owner" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end $$;
