import { describe, expect, it } from "vitest";
import { budgetMonth, summarize, tripSpent } from "./budget";
import type { Tx } from "./types";

const shifted = new Set(["salaire"]);
const tx = (booked_on: string, category_id: string | null) => ({
  booked_on,
  category_id,
});

describe("budgetMonth", () => {
  it("reporte un salaire de fin de mois sur le mois suivant", () => {
    expect(budgetMonth(tx("2026-10-30", "salaire"), shifted)).toBe("2026-11");
    expect(budgetMonth(tx("2026-12-31", "salaire"), shifted)).toBe("2027-01");
    expect(budgetMonth(tx("2026-02-27", "salaire"), shifted)).toBe("2026-03");
  });

  it("laisse dans son mois un salaire arrivé en début de mois", () => {
    expect(budgetMonth(tx("2026-11-02", "salaire"), shifted)).toBe("2026-11");
  });

  it("ne touche pas aux autres catégories ni aux opérations non classées", () => {
    expect(budgetMonth(tx("2026-10-30", "courses"), shifted)).toBe("2026-10");
    expect(budgetMonth(tx("2026-10-30", null), shifted)).toBe("2026-10");
  });
});

describe("voyages", () => {
  const op = (id: string, amount: number, trip_id: string | null): Tx => ({
    id,
    account_id: "a",
    booked_on: "2026-10-06",
    amount,
    label: id,
    category_id: "voyages",
    is_transfer: false,
    trip_id,
    external_id: id,
  });
  const transactions = [
    op("vol", -625.76, "turquie"),
    op("hotel", -695.2, "turquie"),
    op("remboursement", 663, "turquie"),
    op("train", -40, null),
  ];

  it("calcule le coût net d'un voyage, remboursements déduits", () => {
    expect(tripSpent("turquie", transactions)).toBeCloseTo(657.96);
    expect(tripSpent("ski", transactions)).toBe(0);
  });

  it("sort du budget mensuel les opérations rattachées à un voyage", () => {
    const s = summarize("perso", "2026-10", {
      accounts: [
        {
          id: "a",
          bank: "",
          name: "",
          kind: "courant",
          budget_scope: "perso",
          share: 1,
          sort: 0,
        },
      ],
      categories: [
        {
          id: "voyages",
          name: "Voyages",
          kind: "depense",
          shift_next_month: false,
          sort: 0,
        },
      ],
      budgets: [],
      transactions,
    });
    expect(s.spent).toBe(40);
    expect(s.income).toBe(0);
  });
});
