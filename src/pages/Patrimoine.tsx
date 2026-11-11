import { useState } from "react";
import { latest, netWorth } from "../budget";
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

const KIND_ICON: Record<AccountKind, [string, number]> = {
  courant: ["💳", 225],
  epargne: ["🐷", 340],
  placement: ["📈", 150],
};

export default function Patrimoine() {
  const { accounts, balances } = useData();
  const now = today();

  const mine = (a: Account) =>
    (latest(balances, a.id, now)?.amount ?? 0) * a.share;
  const total = netWorth(accounts, balances, now);

  const series = Array.from({ length: 12 }, (_, i) =>
    shiftMonth(currentMonth(), i - 11),
  ).map((m) => ({
    month: m,
    // « AAAA-MM-31 » borne la fin du mois en comparaison de chaînes, même pour les mois plus courts.
    total: netWorth(accounts, balances, `${m}-31`),
  }));

  const kinds = Object.keys(KIND_LABEL) as AccountKind[];

  return (
    <>
      <div className="page-head">
        <h1>Patrimoine</h1>
      </div>

      <section className="card hero">
        <h2>Total (ma part)</h2>
        <span className="amount">{money0(total)}</span>
        {balances.length > 0 ? (
          <Chart series={series} />
        ) : (
          <p className="muted" style={{ margin: "8px 0 0" }}>
            Saisis le solde de chaque compte ci-dessous pour démarrer le suivi.
          </p>
        )}
      </section>

      {kinds.map((k) => {
        const list = accounts.filter((a) => a.kind === k);
        if (!list.length) return null;
        return (
          <section className="card" key={k}>
            <div className="card-head">
              <h2>{KIND_LABEL[k]}</h2>
              <strong className="num">
                {money0(list.reduce((s, a) => s + mine(a), 0))}
              </strong>
            </div>
            <div className="rows">
              {list.map((a) => (
                <AccountRow
                  key={a.id}
                  account={a}
                  last={latest(balances, a.id, now)}
                />
              ))}
            </div>
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
  const [draft, setDraft] = useState<string | null>(null);
  const [emoji, hue] = KIND_ICON[account.kind];

  const save = async () => {
    const text = draft ?? "";
    const n = Number(text.replace(/\s/g, "").replace(",", "."));
    if (text.trim() !== "" && Number.isFinite(n))
      await setBalance(account.id, today(), n);
    setDraft(null);
  };

  return (
    <div className="row">
      <span
        className="cat-icon"
        style={{ "--hue": hue } as React.CSSProperties}
        aria-hidden="true"
      >
        {emoji}
      </span>
      <div className="main">
        <div className="title">{account.name}</div>
        <div className="muted small">
          {account.bank}
          {account.share < 1 &&
            ` · ma part ${Math.round(account.share * 100)} %`}
          {last && ` · au ${dayLabel(last.as_of)}`}
        </div>
      </div>
      {draft === null ? (
        <button
          className="ghost small num"
          aria-label={`Modifier le solde ${account.name}`}
          onClick={() => setDraft("")}
        >
          {last ? money(last.amount) : "Saisir"}
        </button>
      ) : (
        <span style={{ display: "flex", gap: 6 }}>
          <input
            className="limit"
            style={{ width: "6.5em" }}
            inputMode="decimal"
            autoFocus
            placeholder="Solde"
            aria-label={`Nouveau solde ${account.name}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void save()}
          />
          <button className="small" onClick={() => void save()}>
            OK
          </button>
        </span>
      )}
    </div>
  );
}

function Chart({ series }: { series: { month: string; total: number }[] }) {
  const W = 600;
  const H = 110;
  const values = series.map((s) => s.total);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (series.length - 1)) * W;
  const y = (v: number) => H - 14 - ((v - min) / span) * (H - 34);
  const points = series.map((s, i) => `${x(i)},${y(s.total)}`).join(" ");

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Évolution du patrimoine de ${monthLabel(series[0].month)} à ${monthLabel(series[series.length - 1].month)}`}
      >
        <polygon points={`0,${H} ${points} ${W},${H}`} className="area" />
        <polyline points={points} className="line" />
      </svg>
    </figure>
  );
}
