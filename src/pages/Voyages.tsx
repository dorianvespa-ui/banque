import { useState, type FormEvent } from "react";
import { tripSpent } from "../budget";
import { useData } from "../data";
import { dayLabel, money, money0 } from "../format";
import type { Trip } from "../types";
import { Ring } from "../ui";

const parse = (text: string) =>
  Number(text.replace(/\s/g, "").replace(",", "."));

const period = (t: Trip) =>
  t.starts_on && t.ends_on
    ? `du ${dayLabel(t.starts_on)} au ${dayLabel(t.ends_on)}`
    : t.starts_on
      ? `à partir du ${dayLabel(t.starts_on)}`
      : "dates à préciser";

export default function Voyages() {
  const { trips, insert } = useData();
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const add = (e: FormEvent) => {
    e.preventDefault();
    const amount = budget.trim() ? parse(budget) : 0;
    if (!name.trim() || !Number.isFinite(amount) || amount < 0) return;
    void insert("trips", [
      {
        name: name.trim(),
        budget: amount,
        starts_on: start || null,
        ends_on: end || null,
      },
    ]);
    setName("");
    setBudget("");
    setStart("");
    setEnd("");
  };

  return (
    <>
      <div className="page-head">
        <h1>Voyages</h1>
      </div>
      <p className="muted small">
        Chaque voyage a son propre budget, financé par ton épargne. Les
        opérations que tu y rattaches (billets, hôtel, dépenses sur place,
        remboursements reçus) ne comptent plus dans tes plafonds du mois.
      </p>

      {trips.map((t) => (
        <TripCard key={t.id} trip={t} />
      ))}

      <form className="card" onSubmit={add}>
        <h2>Nouveau voyage</h2>
        <div className="filters">
          <input
            placeholder="Destination"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            inputMode="decimal"
            placeholder="Budget net prévu (€)"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </div>
        <div className="filters">
          <input
            type="date"
            aria-label="Date de départ"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <input
            type="date"
            aria-label="Date de retour"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <button style={{ width: "100%" }}>Créer le voyage</button>
      </form>
    </>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const { transactions, categories, accounts, update, remove } = useData();
  const [draft, setDraft] = useState<string | null>(null);

  const ops = transactions.filter((t) => t.trip_id === trip.id);
  const spent = tripSpent(trip.id, transactions);
  const paid = ops.reduce((s, t) => (t.amount < 0 ? s - t.amount : s), 0);
  const refunded = ops.reduce((s, t) => (t.amount > 0 ? s + t.amount : s), 0);
  const left = trip.budget - spent;
  const ratio = trip.budget ? spent / trip.budget : 0;

  // Suggestions : dépenses de voyage non rattachées, ou opérations faites pendant le séjour.
  const travel = new Set(
    categories.filter((c) => /voyage/i.test(c.name)).map((c) => c.id),
  );
  const budgeted = new Set(
    accounts.filter((a) => a.budget_scope).map((a) => a.id),
  );
  const suggestions = transactions
    .filter(
      (t) =>
        !t.trip_id &&
        !t.is_transfer &&
        budgeted.has(t.account_id) &&
        ((t.category_id !== null && travel.has(t.category_id)) ||
          (trip.starts_on !== null &&
            trip.ends_on !== null &&
            t.booked_on >= trip.starts_on &&
            t.booked_on <= trip.ends_on)),
    )
    .slice(0, 30);

  const saveBudget = () => {
    const n = parse(draft ?? "");
    if ((draft ?? "").trim() !== "" && Number.isFinite(n) && n >= 0)
      void update("trips", trip.id, { budget: n });
    setDraft(null);
  };

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{trip.name}</h2>
          <span className="muted small">{period(trip)}</span>
        </div>
        <button
          className="ghost small"
          aria-label={`Supprimer le voyage ${trip.name}`}
          onClick={() =>
            confirm(
              `Supprimer le voyage « ${trip.name} » ? Ses opérations sont conservées et reviennent dans les budgets du mois.`,
            ) && void remove("trips", trip.id)
          }
        >
          ✕
        </button>
      </div>

      <div className="gauge">
        {trip.budget > 0 && (
          <Ring ratio={ratio}>{Math.round(ratio * 100)} %</Ring>
        )}
        <div>
          <span
            className={`amount ${trip.budget > 0 && left < 0 ? "bad" : ""}`}
          >
            {money0(trip.budget > 0 ? Math.abs(left) : spent)}
          </span>
          <span className="muted small">
            {trip.budget > 0
              ? left < 0
                ? `de dépassement sur ${money0(trip.budget)}`
                : `restants sur ${money0(trip.budget)}`
              : "dépensés, aucun budget défini"}
          </span>
        </div>
      </div>

      <div className="stats">
        <div>
          <span>Payé</span>
          <strong>{money0(paid)}</strong>
        </div>
        <div>
          <span>Remboursé</span>
          <strong className={refunded > 0 ? "good" : ""}>
            {money0(refunded)}
          </strong>
        </div>
        <div>
          <span>Coût net</span>
          <strong>{money0(spent)}</strong>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 0 }}>
        {draft === null ? (
          <button
            className="ghost small"
            onClick={() => setDraft(String(trip.budget))}
          >
            Modifier le budget
          </button>
        ) : (
          <>
            <input
              inputMode="decimal"
              autoFocus
              aria-label={`Budget du voyage ${trip.name}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveBudget()}
            />
            <button onClick={saveBudget}>OK</button>
          </>
        )}
      </div>

      {ops.length > 0 && (
        <details>
          <summary>
            {ops.length} opération{ops.length > 1 ? "s" : ""} rattachée
            {ops.length > 1 ? "s" : ""}
          </summary>
          <div className="rows" style={{ marginTop: 8 }}>
            {ops.map((t) => (
              <div
                className="row"
                key={t.id}
                style={{ gridTemplateColumns: "1fr auto auto" }}
              >
                <div className="main">
                  <div className="title">{t.label}</div>
                  <div className="muted small">{dayLabel(t.booked_on)}</div>
                </div>
                <span className={`value ${t.amount > 0 ? "good" : ""}`}>
                  {t.amount > 0 ? "+" : ""}
                  {money(t.amount)}
                </span>
                <button
                  className="ghost small"
                  aria-label={`Détacher ${t.label}`}
                  onClick={() =>
                    void update("transactions", t.id, { trip_id: null })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {suggestions.length > 0 && (
        <details>
          <summary>
            {suggestions.length} opération{suggestions.length > 1 ? "s" : ""} à
            rattacher ?
          </summary>
          <div className="rows" style={{ marginTop: 8 }}>
            {suggestions.map((t) => (
              <div
                className="row"
                key={t.id}
                style={{ gridTemplateColumns: "1fr auto auto" }}
              >
                <div className="main">
                  <div className="title">{t.label}</div>
                  <div className="muted small">{dayLabel(t.booked_on)}</div>
                </div>
                <span className={`value ${t.amount > 0 ? "good" : ""}`}>
                  {t.amount > 0 ? "+" : ""}
                  {money(t.amount)}
                </span>
                <button
                  className="small"
                  aria-label={`Rattacher ${t.label}`}
                  onClick={() =>
                    void update("transactions", t.id, { trip_id: trip.id })
                  }
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
