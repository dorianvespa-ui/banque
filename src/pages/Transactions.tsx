import { useState } from "react";
import { budgetMonth, isTodo } from "../budget";
import { decodeFile, parseStatement } from "../csv";
import { useData } from "../data";
import { longDay, money, monthLabel } from "../format";
import type { Tx } from "../types";
import { CatIcon } from "../ui";

const PAGE = 150;

export default function Transactions() {
  const { accounts, categories, transactions } = useData();
  const [accountId, setAccountId] = useState("");
  const [month, setMonth] = useState("");
  const [search, setSearch] = useState("");
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const q = search.trim().toLowerCase();
  const rows = transactions.filter(
    (t) =>
      (!accountId || t.account_id === accountId) &&
      (!month || t.booked_on.startsWith(month)) &&
      (!q || t.label.toLowerCase().includes(q)) &&
      (!onlyTodo || isTodo(t)),
  );
  const todo = transactions.filter(isTodo).length;
  const accountName = new Map(
    accounts.map((a) => [a.id, `${a.bank} · ${a.name}`]),
  );
  const shifted = new Set(
    categories.filter((c) => c.shift_next_month).map((c) => c.id),
  );

  // Regroupe les opérations affichées par jour (elles arrivent déjà triées par date).
  const days: { date: string; txs: Tx[] }[] = [];
  for (const t of rows.slice(0, shown)) {
    const last = days[days.length - 1];
    if (last?.date === t.booked_on) last.txs.push(t);
    else days.push({ date: t.booked_on, txs: [t] });
  }

  return (
    <>
      <div className="page-head">
        <h1>Opérations</h1>
      </div>
      <Import />

      <div className="filters">
        <input
          type="search"
          placeholder="Rechercher un libellé"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          aria-label="Compte"
        >
          <option value="">Tous les comptes</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {accountName.get(a.id)}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="Mois"
        />
        <button
          className={onlyTodo ? "small" : "small ghost"}
          aria-pressed={onlyTodo}
          onClick={() => setOnlyTodo(!onlyTodo)}
        >
          À classer{todo > 0 ? ` (${todo})` : ""}
        </button>
      </div>

      {rows.length === 0 && (
        <p className="muted" style={{ textAlign: "center", marginTop: 32 }}>
          {transactions.length === 0
            ? "Aucune opération. Importe un relevé pour commencer."
            : "Aucune opération ne correspond à ces filtres."}
        </p>
      )}

      {days.map((d) => (
        <section key={d.date}>
          <div className="day">{longDay(d.date)}</div>
          <div className="card rows" style={{ margin: 0 }}>
            {d.txs.map((t) => (
              <Row
                key={t.id}
                tx={t}
                account={accountName.get(t.account_id) ?? ""}
                counted={budgetMonth(t, shifted)}
              />
            ))}
          </div>
        </section>
      ))}

      {rows.length > shown && (
        <button
          className="ghost"
          style={{ width: "100%", marginTop: 16 }}
          onClick={() => setShown(shown + PAGE)}
        >
          Afficher plus ({rows.length - shown} restantes)
        </button>
      )}
    </>
  );
}

function Row({
  tx,
  account,
  counted,
}: {
  tx: Tx;
  account: string;
  counted: string;
}) {
  const { categories, trips, update, insert, remove } = useData();

  const category = categories.find((c) => c.id === tx.category_id);
  const value = tx.is_transfer ? "transfer" : (tx.category_id ?? "");
  const change = (v: string) =>
    void update("transactions", tx.id, {
      is_transfer: v === "transfer",
      category_id: v === "transfer" || v === "" ? null : v,
    });

  const addRule = () => {
    const pattern = prompt(
      "Créer une règle : toute opération dont le libellé contient ce texte sera classée de la même façon.",
      tx.label,
    )?.trim();
    if (pattern)
      void insert("rules", [
        {
          pattern,
          // Libellé repris tel quel : la règle ne vise que lui.
          exact: pattern.toLowerCase() === tx.label.toLowerCase(),
          category_id: tx.category_id,
          is_transfer: tx.is_transfer,
        },
      ]);
  };

  return (
    <div className="row">
      {tx.is_transfer ? (
        <span
          className="cat-icon"
          style={{ "--hue": 225 } as React.CSSProperties}
        >
          ↔
        </span>
      ) : (
        <CatIcon name={category?.name ?? null} />
      )}
      <div className="main">
        <div className="title">{tx.label}</div>
        <div className="muted small">
          {account}
          {counted !== tx.booked_on.slice(0, 7) && (
            <> · compté en {monthLabel(counted)}</>
          )}
        </div>
      </div>
      <span className={`value ${tx.amount > 0 ? "good" : ""}`}>
        {tx.amount > 0 ? "+" : ""}
        {money(tx.amount)}
      </span>
      <div className="wide tx-tools">
        <select
          value={value}
          onChange={(e) => change(e.target.value)}
          className={value || tx.trip_id ? "pill" : "pill todo"}
          aria-label="Catégorie"
        >
          <option value="">À classer</option>
          <option value="transfer">↔ Virement interne</option>
          <optgroup label="Dépenses">
            {categories
              .filter((c) => c.kind === "depense")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </optgroup>
          <optgroup label="Revenus">
            {categories
              .filter((c) => c.kind === "revenu")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </optgroup>
        </select>
        {trips.length > 0 && (
          <select
            value={tx.trip_id ?? ""}
            onChange={(e) =>
              void update("transactions", tx.id, {
                trip_id: e.target.value || null,
              })
            }
            className="pill"
            aria-label="Voyage"
          >
            <option value="">Hors voyage</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                ✈️ {t.name}
              </option>
            ))}
          </select>
        )}
        <span style={{ flex: 1 }} />
        {value && (
          <button
            className="ghost small"
            title="Créer une règle à partir de cette opération"
            onClick={addRule}
          >
            + règle
          </button>
        )}
        <button
          className="ghost small"
          title="Supprimer cette opération"
          aria-label="Supprimer cette opération"
          onClick={() =>
            confirm("Supprimer cette opération ?") &&
            void remove("transactions", tx.id)
          }
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function Import() {
  const { accounts, importTransactions } = useData();
  const importable = accounts.filter((a) => a.budget_scope);
  const [accountId, setAccountId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const target = accountId || importable[0]?.id;

  const onFile = async (file: File | undefined) => {
    if (!file || !target) return;
    setBusy(true);
    setMessage(null);
    try {
      const parsed = parseStatement(decodeFile(await file.arrayBuffer()));
      const added = await importTransactions(target, parsed);
      setMessage(
        `${added} opération${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""}` +
          (parsed.length > added
            ? `, ${parsed.length - added} déjà présente(s) ignorée(s).`
            : "."),
      );
    } catch (e) {
      setMessage(`Import impossible : ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="card">
      <summary>Importer un relevé (CSV)</summary>
      <p className="muted small" style={{ marginTop: 8 }}>
        Télécharge le relevé depuis ta banque au format CSV, choisis le compte,
        puis sélectionne le fichier. Réimporter une période déjà chargée ne crée
        pas de doublons.
      </p>
      <div className="filters">
        <select
          value={target ?? ""}
          onChange={(e) => setAccountId(e.target.value)}
          aria-label="Compte cible"
        >
          {importable.map((a) => (
            <option key={a.id} value={a.id}>
              {a.bank} · {a.name}
            </option>
          ))}
        </select>
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        disabled={busy || !target}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {message && <p className="notice">{message}</p>}
    </details>
  );
}
