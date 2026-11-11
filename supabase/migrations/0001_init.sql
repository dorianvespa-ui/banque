-- Schéma initial du tableau de bord budget.
-- Les tables sont préfixées « budget_ » car elles cohabitent avec une autre appli dans le même projet.
-- Chaque ligne appartient à un utilisateur ; la sécurité au niveau des lignes (RLS)
-- garantit qu'on ne lit et n'écrit que ses propres données.

create table public.budget_accounts (
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

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('depense', 'revenu')),
  sort integer not null default 0,
  unique (user_id, name)
);

create table public.budget_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scope text not null check (scope in ('perso', 'joint')),
  category_id uuid not null references public.budget_categories (id) on delete cascade,
  monthly_limit numeric not null check (monthly_limit >= 0),
  unique (user_id, scope, category_id)
);

create table public.budget_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.budget_accounts (id) on delete cascade,
  booked_on date not null,
  amount numeric not null,
  label text not null,
  category_id uuid references public.budget_categories (id) on delete set null,
  -- Virement entre mes propres comptes : exclu des budgets.
  is_transfer boolean not null default false,
  -- Identifiant stable servant à ne pas importer deux fois la même opération.
  external_id text not null,
  created_at timestamptz not null default now(),
  unique (account_id, external_id)
);

create table public.budget_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Texte recherché dans le libellé (sans tenir compte de la casse).
  pattern text not null,
  category_id uuid references public.budget_categories (id) on delete cascade,
  is_transfer boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.budget_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.budget_accounts (id) on delete cascade,
  as_of date not null,
  amount numeric not null,
  unique (account_id, as_of)
);

create index budget_accounts_user_idx on public.budget_accounts (user_id);
create index budget_budgets_category_idx on public.budget_budgets (category_id);
create index budget_transactions_user_date_idx on public.budget_transactions (user_id, booked_on desc);
create index budget_transactions_category_idx on public.budget_transactions (category_id);
create index budget_rules_user_idx on public.budget_rules (user_id);
create index budget_rules_category_idx on public.budget_rules (category_id);
create index budget_balances_user_idx on public.budget_balances (user_id);

do $$
declare
  t text;
begin
  foreach t in array array['budget_accounts', 'budget_categories', 'budget_budgets', 'budget_transactions', 'budget_rules', 'budget_balances']
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
