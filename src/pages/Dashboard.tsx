import { useState } from "react";
import { netWorth, summarize } from "../budget";
import { useData } from "../data";
import { currentMonth, money0, monthLabel, shiftMonth, today } from "../format";
import { SCOPE_LABEL, type Scope } from "../types";

export default function Dashboard() {
  const data = useData();
  const [month, setMonth] = useState(currentMonth);

  const todo = data.transactions.filter(
    (t) => !t.category_id && !t.is_transfer,
  ).length;
  const worth = netWorth(data.accounts, data.balances, today());
  const worthBefore = netWorth(
    data.accounts,
    data.balances,
    `${shiftMonth(currentMonth(), -1)}-31`,
  );

  return (
    <>
      <div className="title-row">
        <h1>Tableau de bord</h1>
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

      {todo > 0 && (
        <p className="notice">
          {todo} opération{todo > 1 ? "s" : ""} à classer.{" "}
          <a href="#transactions">Les classer</a>
        </p>
      )}

      <div className="duo">
        <ScopeCard scope="perso" month={month} />
        <ScopeCard scope="joint" month={month} />
      </div>

      <a className="card link-card" href="#patrimoine">
        <h2>Patrimoine</h2>
        {data.balances.length === 0 ? (
          <p className="muted">
            Saisis les soldes de tes comptes pour suivre ton patrimoine.
          </p>
        ) : (
          <p className="big">
            <strong>{money0(worth)}</strong>
            {worthBefore !== 0 && (
              <span
                className={`small ${worth - worthBefore < 0 ? "bad" : "good"}`}
              >
                {worth - worthBefore >= 0 ? "+" : ""}
                {money0(worth - worthBefore)} depuis fin{" "}
                {monthLabel(shiftMonth(currentMonth(), -1), true)}
              </span>
            )}
          </p>
        )}
      </a>
    </>
  );
}

function ScopeCard({ scope, month }: { scope: Scope; month: string }) {
  const data = useData();
  const s = summarize(scope, month, data);
  const ratio = s.planned ? s.spent / s.planned : 0;
  const left = s.planned - s.spent;

  const over = s.expenses.filter(
    (e) => e.limit !== undefined && e.spent > e.limit,
  );
  const top = [...s.expenses]
    .filter((e) => e.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 4);

  const history = Array.from({ length: 6 }, (_, i) =>
    shiftMonth(month, i - 5),
  ).map((m) => ({ month: m, spent: summarize(scope, m, data).spent }));
  const max = Math.max(s.planned, ...history.map((h) => h.spent), 1);

  return (
    <a className="card link-card" href={`#${scope}`}>
      <h2>{SCOPE_LABEL[scope]}</h2>
      <p className="big">
        <strong className={s.planned && left < 0 ? "bad" : ""}>
          {s.planned ? money0(left) : money0(s.spent)}
        </strong>
        <span className="muted small">
          {s.planned
            ? left < 0
              ? `de dépassement sur ${money0(s.planned)}`
              : `restants sur ${money0(s.planned)}`
            : "dépensés (aucun plafond défini)"}
        </span>
      </p>
      {s.planned > 0 && (
        <div className="bar tall">
          <div
            className={
              ratio > 1 ? "fill over" : ratio > 0.85 ? "fill warn" : "fill"
            }
            style={{ width: `${Math.min(ratio, 1) * 100}%` }}
          />
        </div>
      )}
      <dl className="pairs">
        <dt>Revenus</dt>
        <dd>{money0(s.income)}</dd>
        <dt>Dépenses</dt>
        <dd>{money0(s.spent)}</dd>
        <dt>Solde du mois</dt>
        <dd className={s.income - s.spent < 0 ? "bad" : "good"}>
          {money0(s.income - s.spent)}
        </dd>
      </dl>

      {over.length > 0 && (
        <p className="bad small">
          Plafond dépassé :{" "}
          {over
            .map((e) => `${e.category.name} (+${money0(e.spent - e.limit!)})`)
            .join(", ")}
        </p>
      )}

      {top.length > 0 && (
        <>
          <h3>Principales dépenses</h3>
          <dl className="pairs">
            {top.map((e) => (
              <div key={e.category.id} style={{ display: "contents" }}>
                <dt>{e.category.name}</dt>
                <dd>
                  {money0(e.spent)}
                  {e.limit !== undefined && (
                    <span className="muted"> / {money0(e.limit)}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <div className="history mini">
        {history.map((h) => (
          <div key={h.month} className="history-col">
            <div
              className={
                s.planned && h.spent > s.planned
                  ? "history-bar over"
                  : "history-bar"
              }
              style={{ height: `${(h.spent / max) * 100}%` }}
              title={`${monthLabel(h.month)} : ${money0(h.spent)}`}
            />
            <span className="small muted">{monthLabel(h.month, true)}</span>
          </div>
        ))}
      </div>
    </a>
  );
}
