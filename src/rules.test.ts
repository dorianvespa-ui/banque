import { describe, expect, it } from "vitest";
import { matchRule } from "./rules";
import type { Rule } from "./types";

const rule = (pattern: string, exact = false): Rule => ({
  id: pattern,
  pattern,
  exact,
  category_id: pattern,
  is_transfer: false,
});

describe("matchRule", () => {
  it("préfère la règle la plus longue parmi celles contenues", () => {
    const rules = [rule("uber"), rule("uber eats")];
    expect(matchRule("Uber Eats", rules)?.pattern).toBe("uber eats");
    expect(matchRule("UBER *TRIP", rules)?.pattern).toBe("uber");
  });

  it("n'applique une règle exacte qu'au libellé identique", () => {
    const rules = [rule("Eni", true), rule("Nicolas", true)];
    expect(matchRule("eni", rules)?.pattern).toBe("Eni");
    expect(matchRule("Virement de : DENIS NICOLAS", rules)).toBeUndefined();
  });

  it("fait passer une règle exacte avant une règle contenue", () => {
    const rules = [rule("carrefour"), rule("Carrefour", true)];
    expect(matchRule("Carrefour", rules)?.exact).toBe(true);
    expect(matchRule("Carrefour Market Nice", rules)?.exact).toBe(false);
  });
});
