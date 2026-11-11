import { useState } from "react";
import { decodeFile, parseStatement } from "../csv";
import { useData } from "../data";
import { dayLabel, money } from "../format";
import type { Tx } from "../types";

const PAGE = 200;

export default function Transactions() {
  const data = useData();
  const { accounts, transactions } = data;
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
      (!onlyTodo || (!t.category_id && !t.is_transfer)),
  );
  const accountName = new Map(
    accounts.map((a) => [a.id, `${a.bank} · ${a.name}`]),
  );

  return (
    <>
      <h1>Opérations</h1>
      <Import />

      <section className="card">
        <div className="filters">
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
          <input
            placeholder="Rechercher un libellé"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={onlyTodo}
              onChange={(e) => setOnlyTodo(e.target.checked)}
            />
            À classer
          </label>
        </div>

        {rows.length === 0 ? (
          <p className="muted">
            Aucune opération. Importe un relevé ci-dessus pour commencer.
          </p>
        ) : (
          <div className="scroll">
            <table className="tx">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Libellé</th>
                  <th className="num">Montant</th>
                  <th>Catégorie</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, shown).map((t) => (
                  <Row
                    key={t.id}
                    tx={t}
                    account={accountName.get(t.account_id) ?? ""}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > shown && (
          <button className="ghost" onClick={() => setShown(shown + PAGE)}>
            Afficher plus ({rows.length - shown} restantes)
          </button>
        )}
      </section>
    </>
  );
}

function Row({ tx, account }: { tx: Tx; account: string }) {
  const { categories, update, insert, remove } = useData();

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
        { pattern, category_id: tx.category_id, is_transfer: tx.is_transfer },
      ]);
  };

  return (
    <tr>
      <td className="nowrap date">{dayLabel(tx.booked_on)}</td>
      <td>
        {tx.label}
        <div className="muted small">
          <span className="only-mobile">{dayLabel(tx.booked_on)} · </span>
          {account}
        </div>
      </td>
      <td className={`num nowrap ${tx.amount > 0 ? "good" : ""}`}>
        {money(tx.amount)}
      </td>
      <td>
        <select
          value={value}
          onChange={(e) => change(e.target.value)}
          className={value ? "" : "todo"}
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
      </td>
      <td className="nowrap">
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
          onClick={() =>
            confirm("Supprimer cette opération ?") &&
            void remove("transactions", tx.id)
          }
        >
          ✕
        </button>
      </td>
    </tr>
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
    <section className="card">
      <h2>Importer un relevé (CSV)</h2>
      <p className="muted">
        Télécharge le relevé depuis l'appli de ta banque au format CSV, choisis
        le compte, puis dépose le fichier. Réimporter une période déjà chargée
        ne crée pas de doublons.
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
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy || !target}
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {message && <p className="notice">{message}</p>}
    </section>
  );
}
