import type { Account, Category } from "./types";

type NewAccount = Omit<Account, "id">;
type NewCategory = Omit<Category, "id">;

const account = (
  bank: string,
  name: string,
  kind: Account["kind"],
  budget_scope: Account["budget_scope"] = null,
  share = 1,
) => ({ bank, name, kind, budget_scope, share });

export const DEFAULT_ACCOUNTS: NewAccount[] = [
  account("Revolut", "Compte courant", "courant", "perso"),
  account("Revolut", "Compte joint", "courant", "joint", 0.5),
  account("Revolut", "Épargne", "epargne"),
  account("Crédit Agricole", "Compte courant", "courant", "perso"),
  account("Crédit Agricole", "Livret A", "epargne"),
  account("Crédit Agricole", "Livret Jeune", "epargne"),
  account("Crédit Agricole", "PEA", "placement"),
  account("Crédit Agricole", "Assurance vie", "placement"),
  account("Natixis", "PEE", "placement"),
].map((a, sort) => ({ ...a, sort }));

const EXPENSES = [
  "Logement",
  "Courses",
  "Restaurants & sorties",
  "Transport",
  "Abonnements",
  "Santé",
  "Shopping",
  "Loisirs",
  "Voyages",
  "Impôts & frais",
  "Divers",
];
const INCOMES = ["Salaire", "Autres revenus"];

export const DEFAULT_CATEGORIES: NewCategory[] = [
  ...EXPENSES.map((name) => ({ name, kind: "depense" as const })),
  ...INCOMES.map((name) => ({ name, kind: "revenu" as const })),
].map((c, sort) => ({ ...c, sort }));
