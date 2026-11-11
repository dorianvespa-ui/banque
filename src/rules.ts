import type { Rule } from "./types";

/**
 * Règle à appliquer à un libellé. Une règle « exacte » l'emporte toujours ;
 * sinon, parmi les règles dont le texte est contenu dans le libellé, la plus
 * longue gagne (« uber eats » avant « uber »).
 */
export function matchRule(label: string, rules: Rule[]): Rule | undefined {
  const l = label.toLowerCase();
  let best: Rule | undefined;
  let bestScore = 0;
  for (const r of rules) {
    const p = r.pattern.toLowerCase();
    if (!p) continue;
    const score = r.exact
      ? l === p
        ? Infinity
        : 0
      : l.includes(p)
        ? p.length
        : 0;
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}
