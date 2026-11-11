import { describe, expect, it } from "vitest";
import { budgetMonth } from "./budget";

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
