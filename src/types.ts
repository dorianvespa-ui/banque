export type Scope = "perso" | "joint";
export type AccountKind = "courant" | "epargne" | "placement";

export interface Account {
  id: string;
  bank: string;
  name: string;
  kind: AccountKind;
  budget_scope: Scope | null;
  share: number;
  sort: number;
}

export interface Category {
  id: string;
  name: string;
  kind: "depense" | "revenu";
  /** Revenu de fin de mois compté dans le budget du mois suivant. */
  shift_next_month: boolean;
  sort: number;
}

export interface Budget {
  id: string;
  scope: Scope;
  category_id: string;
  monthly_limit: number;
}

export interface Tx {
  id: string;
  account_id: string;
  booked_on: string;
  amount: number;
  label: string;
  category_id: string | null;
  is_transfer: boolean;
  external_id: string;
}

export interface Rule {
  id: string;
  pattern: string;
  category_id: string | null;
  is_transfer: boolean;
}

export interface Balance {
  id: string;
  account_id: string;
  as_of: string;
  amount: number;
}

export const SCOPE_LABEL: Record<Scope, string> = {
  perso: "Perso",
  joint: "Compte joint",
};
export const KIND_LABEL: Record<AccountKind, string> = {
  courant: "Comptes courants",
  epargne: "Épargne",
  placement: "Placements",
};
