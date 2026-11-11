import { useState } from "react";
import { useData } from "../data";
import {
  currentMonth,
  dayLabel,
  money,
  money0,
  monthLabel,
  shiftMonth,
  today,
} from "../format";
import {
  KIND_LABEL,
  type Account,
  type AccountKind,
  type Balance,
} from "../types";

/** Dernier solde connu d'un compte à une date donnée. */
function latest(
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

export default function Patrimoine() {
  const { accounts, balances } = useData();
  const now = today();

  const mine = (a: Account, until: string) =>
    (latest(balances, a.id, until)?.amount ?? 0) * a.share;
  const total = accounts.reduce((sum, a) => sum + mine(a, now), 0);

  const months = Array.from({ length: 12 }, (_, i) =>
    shiftMonth(currentMonth(), i - 11),
  );
  const series = months.map((m) => ({
    month: m,
    // « AAAA-MM-31 » borne la fin du mois en comparaison de chaînes, même pour les mois plus courts.
    total: accounts.reduce((sum, a) => sum + mine(a, `${m}-31`), 0),
  }));

  const kinds = Object.keys(KIND_LABEL) as AccountKind[];

  return (
    <>
      <h1>Patrimoine</h1>
      <div className="tiles">
        <div className="tile">
          <span className="muted small">Total (ma part)</span>
          <strong>{money0(total)}</strong>
        </div>
        {kinds.map((k) => (
          <div className="tile" key={k}>
            <span className="muted small">{KIND_LABEL[k]}</span>
            <strong>
              {money0(
                accounts
                  .filter((a) => a.kind === k)
                  .reduce((s, a) => s + mine(a, now), 0),
              )}
            </strong>
          </div>
        ))}
      </div>

      {balances.length > 0 && (
        <section className="card">
          <h2>Évolution sur 12 mois</h2>
          <Chart series={series} />
        </section>
      )}

      {kinds.map((k) => {
        const list = accounts.filter((a) => a.kind === k);
        if (!list.length) return null;
        return (
          <section className="card" key={k}>
            <h2>{KIND_LABEL[k]}</h2>
            <table>
              <thead>
                <tr>
                  <th>Compte</th>
                  <th className="num">Dernier solde</th>
                  <th className="num">Nouveau solde</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <AccountRow
                    key={a.id}
                    account={a}
                    last={latest(balances, a.id, now)}
                  />
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </>
  );
}

function AccountRow({
  account,
  last,
}: {
  account: Account;
  last: Balance | undefined;
}) {
  const { setBalance } = useData();
  const [draft, setDraft] = useState("");

  const save = async () => {
    const n = Number(draft.replace(/\s/g, "").replace(",", "."));
    if (draft.trim() === "" || !Number.isFinite(n)) return;
    await setBalance(account.id, today(), n);
    setDraft("");
  };

  return (
    <tr>
      <td>
        {account.bank} · {account.name}
        {account.share < 1 && (
          <div className="muted small">
            Ma part : {Math.round(account.share * 100)} %
          </div>
        )}
      </td>
      <td className="num">
        {last ? money(last.amount) : "—"}
        {last && <div className="muted small">au {dayLabel(last.as_of)}</div>}
      </td>
      <td className="num nowrap">
        <input
          className="limit"
          inputMode="decimal"
          placeholder="Solde du jour"
          aria-label={`Nouveau solde ${account.name}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void save()}
        />{" "}
        <button
          className="small"
          disabled={!draft.trim()}
          onClick={() => void save()}
        >
          OK
        </button>
      </td>
    </tr>
  );
}

function Chart({ series }: { series: { month: string; total: number }[] }) {
  const W = 600;
  const H = 160;
  const values = series.map((s) => s.total);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const x = (i: number) => (i / (series.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * (H - 10) - 5;
  const points = series.map((s, i) => `${x(i)},${y(s.total)}`).join(" ");
  const last = series[series.length - 1];

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Évolution du patrimoine"
      >
        <polygon points={`0,${H} ${points} ${W},${H}`} className="area" />
        <polyline points={points} className="line" />
      </svg>
      <figcaption className="muted small">
        <span>{monthLabel(series[0].month)}</span>
        <span>
          {monthLabel(last.month)} : {money0(last.total)}
        </span>
      </figcaption>
    </figure>
  );
}
