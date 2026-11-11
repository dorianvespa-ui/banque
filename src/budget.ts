import { shiftMonth } from "./format";
import type { Account, Balance, Budget, Category, Scope, Tx } from "./types";

/** À partir de ce jour, un revenu « de fin de mois » compte pour le mois suivant. */
export const LATE_DAY = 20;

/**
 * Mois de budget (« AAAA-MM ») auquel rattacher une opération.
 * Un salaire versé fin octobre finance novembre : les catégories listées dans
 * `shifted` basculent sur le mois suivant quand l'opération arrive en fin de mois.
 */
export function budgetMonth(
  tx: { booked_on: string; category_id: string | null; is_transfer?: boolean },
  shifted: ReadonlySet<string>,
): string {
  const month = tx.booked_on.slice(0, 7);
  const late = Number(tx.booked_on.slice(8, 10)) >= LATE_DAY;
  const applies =
    !tx.is_transfer && tx.category_id !== null && shifted.has(tx.category_id);
  return applies && late ? shiftMonth(month, 1) : month;
}

interface BudgetData {
  accounts: Account[];
  categories: Category[];
  budgets: Budget[];
  transactions: Tx[];
}

/** Chiffres d'un budget (perso ou joint) pour un mois donné, hors virements internes. */
export function summarize(scope: Scope, month: string, data: BudgetData) {
  const accountIds = new Set(
    data.accounts.filter((a) => a.budget_scope === scope).map((a) => a.id),
  );
  const shifted = new Set(
    data.categories.filter((c) => c.shift_next_month).map((c) => c.id),
  );
  const kindOf = new Map(data.categories.map((c) => [c.id, c.kind]));
  const limits = new Map(
    data.budgets
      .filter((b) => b.scope === scope)
      .map((b) => [b.category_id, b.monthly_limit]),
  );

  const byCategory = new Map<string, number>();
  let income = 0;
  let spent = 0;
  let carried = 0;
  let uncategorized = 0;
  let uncategorizedCount = 0;
  for (const t of data.transactions) {
    if (t.is_transfer || !accountIds.has(t.account_id)) continue;
    if (budgetMonth(t, shifted) !== month) continue;
    const isIncome = t.category_id
      ? kindOf.get(t.category_id) === "revenu"
      : t.amount > 0;
    if (isIncome) income += t.amount;
    else spent -= t.amount;
    if (!t.booked_on.startsWith(month)) carried += t.amount;
    if (t.category_id) {
      byCategory.set(
        t.category_id,
        (byCategory.get(t.category_id) ?? 0) + t.amount,
      );
    } else {
      uncategorizedCount++;
      if (t.amount < 0) uncategorized -= t.amount;
    }
  }

  const planned = [...limits.values()].reduce((a, b) => a + b, 0);
  const expenses = data.categories
    .filter((c) => c.kind === "depense")
    .map((c) => ({
      category: c,
      spent: -(byCategory.get(c.id) ?? 0) || 0, // évite « -0 »
      limit: limits.get(c.id),
    }));

  return {
    income,
    spent,
    planned,
    carried,
    uncategorized,
    uncategorizedCount,
    expenses,
  };
}

/** Dernier solde connu d'un compte à une date donnée. */
export function latest(
  balances: Balance[],
  accountId: string,
  until: string,
): Balance | undefined {
  let best: Balance | undefined;
  for (const b of balances) {
    if (
      b.account_id === accountId &&
      b.as_of <= until &&
      (!best || b.as_of > best.as_of)
    )
      best = b;
  }
  return best;
}

/** Patrimoine à une date : somme des derniers soldes, pour ma part de chaque compte. */
export function netWorth(
  accounts: Account[],
  balances: Balance[],
  until: string,
): number {
  return accounts.reduce(
    (sum, a) => sum + (latest(balances, a.id, until)?.amount ?? 0) * a.share,
    0,
  );
}
