import { shiftMonth } from "./format";

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
