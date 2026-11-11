import { useMemo, useState } from "react";
import { useData } from "../data";
import { currentMonth, money, money0, monthLabel, shiftMonth } from "../format";
import { SCOPE_LABEL, type Scope } from "../types";

export default function Budget({ scope }: { scope: Scope }) {
  const { accounts, categories, budgets, transactions, setBudget } = useData();
  const [month, setMonth] = useState(currentMonth);

  const scopeAccounts = accounts.filter((a) => a.budget_scope === scope);
  const accountIds = useMemo(
    () => new Set(scopeAccounts.map((a) => a.id)),
    [accounts, scope],
  );

  // Opérations du budget, hors virements internes.
  const scoped = useMemo(
    () =>
      transactions.filter(
        (t) => accountIds.has(t.account_id) && !t.is_transfer,
      ),
    [transactions, accountIds],
  );
  const txs = scoped.filter((t) => t.booked_on.startsWith(month));

  const kindOf = new Map(categories.map((c) => [c.id, c.kind]));
  const isIncome = (t: { amount: number; category_id: string | null }) =>
    t.category_id ? kindOf.get(t.category_id) === "revenu" : t.amount > 0;

  const byCategory = new Map<string, number>();
  let income = 0;
  let spent = 0;
  let uncategorized = 0;
  let uncategorizedCount = 0;
  for (const t of txs) {
    if (isIncome(t)) income += t.amount;
    else spent -= t.amount;
    if (t.category_id)
      byCategory.set(
        t.category_id,
        (byCategory.get(t.category_id) ?? 0) + t.amount,
      );
    else {
      uncategorizedCount++;
      if (t.amount < 0) uncategorized -= t.amount;
    }
  }

  const limits = new Map(
    budgets
      .filter((b) => b.scope === scope)
      .map((b) => [b.category_id, b.monthly_limit]),
  );
  const planned = [...limits.values()].reduce((a, b) => a + b, 0);
  const expenseCategories = categories.filter((c) => c.kind === "depense");

  const history = Array.from({ length: 6 }, (_, i) =>
    shiftMonth(month, i - 5),
  ).map((m) => ({
    month: m,
    spent: scoped
      .filter((t) => t.booked_on.startsWith(m) && !isIncome(t))
      .reduce((sum, t) => sum - t.amount, 0),
  }));
  const historyMax = Math.max(planned, ...history.map((h) => h.spent), 1);

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Budget {SCOPE_LABEL[scope].toLowerCase()}</h1>
          <p className="muted">
            {scopeAccounts.length
              ? scopeAccounts.map((a) => `${a.bank} · ${a.name}`).join(", ")
              : "Aucun compte rattaché à ce budget (voir Réglages)."}
          </p>
        </div>
        <div className="month-nav">
          <button
            className="ghost"
            aria-label="Mois précédent"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            ‹
          </button>
          <span>{monthLabel(month)}</span>
          <button
            className="ghost"
            aria-label="Mois suivant"
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            ›
          </button>
        </div>
      </div>

      <div className="tiles">
        <Tile label="Revenus" value={money0(income)} />
        <Tile label="Dépenses" value={money0(spent)} />
        <Tile
          label="Reste sur le budget"
          value={planned ? money0(planned - spent) : "—"}
          tone={planned && spent > planned ? "bad" : undefined}
          hint={
            planned ? `sur ${money0(planned)} prévus` : "Aucun plafond défini"
          }
        />
        <Tile
          label="Solde du mois"
          value={money0(income - spent)}
          tone={income - spent < 0 ? "bad" : "good"}
        />
      </div>

      {uncategorizedCount > 0 && (
        <p className="notice">
          {uncategorizedCount} opération{uncategorizedCount > 1 ? "s" : ""} non
          classée
          {uncategorizedCount > 1 ? "s" : ""} ce mois-ci ({money(uncategorized)}{" "}
          de dépenses). <a href="#transactions">Les classer</a>
        </p>
      )}

      <section className="card">
        <h2>Dépenses par catégorie</h2>
        <div className="scroll">
          <table className="budget">
            <thead>
              <tr>
                <th>Catégorie</th>
                <th className="bar-col" />
                <th className="num">Dépensé</th>
                <th className="num">Plafond</th>
                <th className="num">Reste</th>
              </tr>
            </thead>
            <tbody>
              {expenseCategories.map((c) => {
                const value = -(byCategory.get(c.id) ?? 0) || 0; // évite « -0 »
                const limit = limits.get(c.id);
                const ratio = limit ? value / limit : 0;
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="bar-col">
                      {limit !== undefined && (
                        <div className="bar">
                          <div
                            className={
                              ratio > 1
                                ? "fill over"
                                : ratio > 0.85
                                  ? "fill warn"
                                  : "fill"
                            }
                            style={{
                              width: `${Math.min(Math.max(ratio, 0), 1) * 100}%`,
                            }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="num">{money(value)}</td>
                    <td className="num">
                      <LimitInput
                        value={limit}
                        onChange={(v) => void setBudget(scope, c.id, v)}
                      />
                    </td>
                    <td
                      className={`num ${limit !== undefined && value > limit ? "bad" : ""}`}
                    >
                      {limit !== undefined ? money(limit - value) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Dépenses des 6 derniers mois</h2>
        <div className="history">
          {history.map((h) => (
            <div key={h.month} className="history-col">
              <span className="muted small">{money0(h.spent)}</span>
              <div
                className={
                  planned && h.spent > planned
                    ? "history-bar over"
                    : "history-bar"
                }
                style={{ height: `${(h.spent / historyMax) * 100}%` }}
              />
              <span className="small">{monthLabel(h.month, true)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Tile(props: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="tile">
      <span className="muted small">{props.label}</span>
      <strong className={props.tone}>{props.value}</strong>
      {props.hint && <span className="muted small">{props.hint}</span>}
    </div>
  );
}

function LimitInput({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = draft.trim() === "" ? null : Number(draft.replace(",", "."));
    setDraft(null);
    if (n === null || (Number.isFinite(n) && n >= 0)) {
      if (n !== (value ?? null)) onChange(n);
    }
  };
  return (
    <input
      className="limit"
      inputMode="decimal"
      placeholder="—"
      aria-label="Plafond mensuel"
      value={draft ?? (value === undefined ? "" : String(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}
