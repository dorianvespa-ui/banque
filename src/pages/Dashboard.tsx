import { useState } from "react";
import { isTodo, netWorth, summarize, tripSpent } from "../budget";
import { useData } from "../data";
import { currentMonth, money0, monthLabel, shiftMonth, today } from "../format";
import { SCOPE_LABEL, type Scope } from "../types";
import { Bar, CatIcon, MonthNav, Ring } from "../ui";

export default function Dashboard() {
  const data = useData();
  const [month, setMonth] = useState(currentMonth);

  const todo = data.transactions.filter(isTodo).length;
  const worth = netWorth(data.accounts, data.balances, today());
  const before = netWorth(
    data.accounts,
    data.balances,
    `${shiftMonth(currentMonth(), -1)}-31`,
  );

  return (
    <>
      <div className="page-head">
        <h1>Tableau de bord</h1>
        <MonthNav month={month} onChange={setMonth} />
      </div>

      <a className="card hero" href="#patrimoine">
        <h2>Patrimoine</h2>
        {data.balances.length === 0 ? (
          <span className="muted">
            Saisis les soldes de tes comptes pour suivre ton patrimoine ›
          </span>
        ) : (
          <>
            <span className="amount">{money0(worth)}</span>
            {before !== 0 && (
              <span className="delta">
                {worth - before >= 0 ? "▲ +" : "▼ "}
                {money0(worth - before)} depuis fin{" "}
                {monthLabel(shiftMonth(currentMonth(), -1), true)}
              </span>
            )}
          </>
        )}
      </a>

      {todo > 0 && (
        <a className="notice" href="#transactions">
          <strong>
            {todo} opération{todo > 1 ? "s" : ""} à classer
          </strong>{" "}
          pour un budget à jour ›
        </a>
      )}

      <div className="duo">
        <ScopeCard scope="perso" month={month} />
        <ScopeCard scope="joint" month={month} />
      </div>

      {data.trips.length > 0 && (
        <a className="card" href="#voyages">
          <div className="card-head">
            <h2>Voyages</h2>
            <span className="chev">›</span>
          </div>
          <div className="rows">
            {data.trips.map((trip) => {
              const spent = tripSpent(trip.id, data.transactions);
              return (
                <div className="row" key={trip.id}>
                  <CatIcon name="Voyages" />
                  <div className="main">
                    <div className="title">{trip.name}</div>
                    <div className="muted small num">
                      {money0(spent)} dépensés sur {money0(trip.budget)}
                    </div>
                  </div>
                  <span
                    className={`value ${trip.budget - spent < 0 ? "bad" : ""}`}
                  >
                    {money0(trip.budget - spent)}
                  </span>
                  <div className="wide">
                    <Bar ratio={trip.budget ? spent / trip.budget : 0} />
                  </div>
                </div>
              );
            })}
          </div>
        </a>
      )}
    </>
  );
}

function ScopeCard({ scope, month }: { scope: Scope; month: string }) {
  const data = useData();
  const s = summarize(scope, month, data);
  const ratio = s.planned ? s.spent / s.planned : 0;
  const left = s.planned - s.spent;

  const over = s.expenses.filter(
    // Un dépassement de quelques centimes ne mérite pas une alerte.
    (e) => e.limit !== undefined && e.spent - e.limit >= 1,
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
    <a className="card" href={`#${scope}`}>
      <div className="card-head">
        <h2>{SCOPE_LABEL[scope]}</h2>
        <span className="chev">›</span>
      </div>

      <div className="gauge">
        {s.planned > 0 && (
          <Ring ratio={ratio}>{Math.round(ratio * 100)} %</Ring>
        )}
        <div>
          <span className={`amount ${s.planned && left < 0 ? "bad" : ""}`}>
            {money0(s.planned ? Math.abs(left) : s.spent)}
          </span>
          <span className="muted small">
            {s.planned
              ? left < 0
                ? `de dépassement sur ${money0(s.planned)}`
                : `restants sur ${money0(s.planned)}`
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

      {over.length > 0 && (
        <p className="alert">
          Plafond dépassé :{" "}
          {over
            .map((e) => `${e.category.name} (+${money0(e.spent - e.limit!)})`)
            .join(", ")}
        </p>
      )}

      {top.length > 0 && (
        <>
          <h3>Principales dépenses</h3>
          <div className="rows">
            {top.map((e) => (
              <div className="row" key={e.category.id}>
                <CatIcon name={e.category.name} />
                <span className="title">{e.category.name}</span>
                <span className="value">
                  {money0(e.spent)}
                  {e.limit !== undefined && (
                    <span className="muted small"> / {money0(e.limit)}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
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
            {monthLabel(h.month, true)}
          </div>
        ))}
      </div>
    </a>
  );
}
