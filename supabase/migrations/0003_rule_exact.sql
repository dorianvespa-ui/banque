-- Règle « exacte » : ne s'applique que si le libellé est identique au texte,
-- pour les noms de commerçants courts (« Eni », « Zara ») qui se retrouveraient
-- sinon à l'intérieur d'autres libellés.
alter table public.budget_rules
  add column exact boolean not null default false;
