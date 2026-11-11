-- Revenus de fin de mois (salaire versé le dernier jour travaillé) :
-- une catégorie marquée ainsi est comptée dans le budget du mois suivant
-- quand l'opération arrive en fin de mois.
alter table public.budget_categories
  add column shift_next_month boolean not null default false;

update public.budget_categories
  set shift_next_month = true
  where kind = 'revenu' and name = 'Salaire';
