import { useState } from "react";
import { summarize } from "../budget";
import { useData } from "../data";
import {
  currentMonth,
  dayLabel,
  money,
  money0,
  monthLabel,
  shiftMonth,
} from "../format";
import { SCOPE_LABEL, type Scope, type Tx } from "../types";
import { Bar, CatIcon, MonthNav, Ring } from "../ui";

export default function Budget({ scope }: { scope: Scope }) {
  const data = useData();
  const { accounts, setBudget } = data;
  const [month, setMonth] = useState(currentMonth);
  // Catégorie dont on affiche le détail des opérations.
  const [open, setOpen] = useState<string | null>(null);

  const scopeAccounts = accounts.filter((a) => a.budget_scope === scope);
  const s = summarize(scope, month, data);
  const ratio = s.planned ? s.spent / s.planned : 0;
  const left = s.planned - s.spent;

  const history = Array.from({ length: 6 }, (_, i) =>
    shiftMonth(month, i - 5),
  ).map((m) => ({ month: m, spent: summarize(scope, m, data).spent }));
  const historyMax = Math.max(s.planned, ...history.map((h) => h.spent), 1);

  return (
    <>
      <div className="page-head">
        <h1>Budgets</h1>
        <MonthNav month={month} onChange={setMonth} />
      </div>

      <div className="segmented">
        {(Object.keys(SCOPE_LABEL) as Scope[]).map((sc) => (
          <a key={sc} href={`#${sc}`} className={sc === scope ? "active" : ""}>
            {SCOPE_LABEL[sc]}
          </a>
        ))}
      </div>

      <section className="card">
        <div className="gauge">
          {s.planned > 0 && (
            <Ring ratio={ratio} size={92}>
              {Math.round(ratio * 100)} %
            </Ring>
          )}
          <div>
            <span className={`amount ${s.planned && left < 0 ? "bad" : ""}`}>
              {money0(s.planned ? Math.abs(left) : s.spent)}
            </span>
            <span className="muted small">
              {s.planned
                ? left < 0
                  ? `de dépassement sur ${money0(s.planned)} prévus`
                  : `restants sur ${money0(s.planned)} prévus`
                : "dépensés, aucun plafond défini"}
            </span>
          </div>
        </div>
        <div className="stats">
          <div>
            <span>Revenus</span>
            <strong>{money0(s.income)}</strong>
          </div>
          <div>
            <span>Dépenses</span>
            <strong>{money0(s.spent)}</strong>
          </div>
          <div>
            <span>Solde</span>
            <strong className={s.income - s.spent < 0 ? "bad" : "good"}>
              {money0(s.income - s.spent)}
            </strong>
          </div>
        </div>
        {s.carried !== 0 && (
          <p className="muted small" style={{ margin: "12px 0 0" }}>
            Revenus : dont {money0(s.carried)} reçus fin{" "}
            {monthLabel(shiftMonth(month, -1), true).replace(/\.$/, "")}.
          </p>
        )}
      </section>

      {s.uncategorizedCount > 0 && (
        <a className="notice" href="#transactions">
          <strong>
            {s.uncategorizedCount} opération
            {s.uncategorizedCount > 1 ? "s" : ""} à classer
          </strong>{" "}
          ce mois-ci ({money(s.uncategorized)} de dépenses) ›
        </a>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Dépenses par catégorie</h2>
          <span className="muted small">Plafond</span>
        </div>
        <div className="rows">
          {s.expenses.map(({ category: c, spent, limit }) => {
            const ops = s.transactions.filter((t) => t.category_id === c.id);
            const isOpen = open === c.id;
            return (
              <div className="row" key={c.id}>
                <button
                  className="link row-toggle"
                  aria-expanded={isOpen}
                  disabled={ops.length === 0}
                  onClick={() => setOpen(isOpen ? null : c.id)}
                >
                  <CatIcon name={c.name} />
                  <span className="main">
                    <span className="title">
                      {c.name}
                      {ops.length > 0 && (
                        <span className="chev"> {isOpen ? "▾" : "▸"}</span>
                      )}
                    </span>
                    <span
                      className={`small num ${limit !== undefined && spent > limit ? "bad" : "muted"}`}
                    >
                      {money(spent)}
                      {limit !== undefined &&
                        (spent > limit
                          ? ` · dépassé de ${money0(spent - limit)}`
                          : ` · reste ${money0(limit - spent)}`)}
                    </span>
                  </span>
                </button>
                <LimitInput
                  value={limit}
                  label={c.name}
                  onChange={(v) => void setBudget(scope, c.id, v)}
                />
                {limit !== undefined && (
                  <div className="wide">
                    <Bar ratio={limit ? spent / limit : spent > 0 ? 2 : 0} />
                  </div>
                )}
                {isOpen && <CategoryOps ops={ops} />}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>Dépenses des 6 derniers mois</h2>
        <div className="history">
          {history.map((h) => (
            <div key={h.month} className="history-col">
              <span className="num">{money0(h.spent)}</span>
              <div
                className={
                  s.planned && h.spent > s.planned
                    ? "history-bar over"
                    : "history-bar"
                }
                style={{ height: `${(h.spent / historyMax) * 100}%` }}
              />
              {monthLabel(h.month, true)}
            </div>
          ))}
        </div>
      </section>

      <p className="muted small" style={{ textAlign: "center" }}>
        {scopeAccounts.length
          ? scopeAccounts.map((a) => `${a.bank} · ${a.name}`).join("  ·  ")
          : "Aucun compte rattaché à ce budget (voir Réglages)."}
      </p>
    </>
  );
}

/** Détail des opérations d'une catégorie ; toucher une ligne permet de la reclasser. */
function CategoryOps({ ops }: { ops: Tx[] }) {
  const { categories, update } = useData();
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="ops">
      {ops.map((t) => (
        <div className="op" key={t.id}>
          <button
            className="link op-line"
            aria-expanded={editing === t.id}
            onClick={() => setEditing(editing === t.id ? null : t.id)}
          >
            <span className="muted small num">
              {dayLabel(t.booked_on).slice(0, 5)}
            </span>
            <span className="op-label">{t.label}</span>
            <span className={`num op-amount ${t.amount > 0 ? "good" : ""}`}>
              {t.amount > 0 ? "+" : ""}
              {money(t.amount)}
            </span>
          </button>
          {editing === t.id && (
            <select
              className="pill"
              aria-label={`Catégorie de ${t.label}`}
              value={t.category_id ?? ""}
              onChange={(e) =>
                void update("transactions", t.id, {
                  is_transfer: e.target.value === "transfer",
                  category_id:
                    e.target.value === "transfer" ? null : e.target.value,
                })
              }
            >
              <option value="transfer">↔ Virement interne</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
      <p className="muted small" style={{ margin: "6px 0" }}>
        Touche une opération pour changer sa catégorie.
      </p>
    </div>
  );
}

function LimitInput({
  value,
  label,
  onChange,
}: {
  value: number | undefined;
  label: string;
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
      aria-label={`Plafond mensuel ${label}`}
      value={draft ?? (value === undefined ? "" : String(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}
