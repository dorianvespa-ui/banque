import { useState, type FormEvent } from "react";
import { LATE_DAY } from "../budget";
import { useData } from "../data";
import { PasswordForm } from "./Password";
import type { Account, AccountKind, Scope } from "../types";

export default function Reglages() {
  return (
    <>
      <h1>Réglages</h1>
      <Accounts />
      <Categories />
      <Rules />
      <section className="card">
        <h2>Mot de passe</h2>
        <PasswordForm />
      </section>
    </>
  );
}

function Accounts() {
  const { accounts, insert, update, remove } = useData();
  const [bank, setBank] = useState("");
  const [name, setName] = useState("");

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!bank.trim() || !name.trim()) return;
    void insert("accounts", [
      {
        bank: bank.trim(),
        name: name.trim(),
        kind: "courant",
        budget_scope: null,
        share: 1,
        sort: accounts.length,
      },
    ]);
    setBank("");
    setName("");
  };

  const patch = (a: Account, p: Partial<Account>) =>
    void update("accounts", a.id, p);

  return (
    <section className="card">
      <h2>Comptes</h2>
      <p className="muted">
        Le budget indique dans quel budget comptent les opérations du compte. «
        Ma part » sert au calcul du patrimoine (50 % pour un compte joint à
        deux).
      </p>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Banque</th>
              <th>Compte</th>
              <th>Type</th>
              <th>Budget</th>
              <th>Ma part</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.bank}</td>
                <td>{a.name}</td>
                <td>
                  <select
                    value={a.kind}
                    onChange={(e) =>
                      patch(a, { kind: e.target.value as AccountKind })
                    }
                  >
                    <option value="courant">Courant</option>
                    <option value="epargne">Épargne</option>
                    <option value="placement">Placement</option>
                  </select>
                </td>
                <td>
                  <select
                    value={a.budget_scope ?? ""}
                    onChange={(e) =>
                      patch(a, {
                        budget_scope: (e.target.value || null) as Scope | null,
                      })
                    }
                  >
                    <option value="">Hors budget</option>
                    <option value="perso">Perso</option>
                    <option value="joint">Joint</option>
                  </select>
                </td>
                <td>
                  <select
                    value={a.share}
                    onChange={(e) =>
                      patch(a, { share: Number(e.target.value) })
                    }
                  >
                    <option value={1}>100 %</option>
                    <option value={0.5}>50 %</option>
                  </select>
                </td>
                <td>
                  <button
                    className="ghost small"
                    onClick={() =>
                      confirm(
                        `Supprimer « ${a.bank} · ${a.name} » ainsi que ses opérations et ses soldes ?`,
                      ) && void remove("accounts", a.id)
                    }
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="filters" onSubmit={add}>
        <input
          placeholder="Banque"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
        />
        <input
          placeholder="Nom du compte"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button>Ajouter un compte</button>
      </form>
    </section>
  );
}

function Categories() {
  const { categories, insert, update, remove } = useData();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"depense" | "revenu">("depense");

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void insert("categories", [
      {
        name: name.trim(),
        kind,
        shift_next_month: false,
        sort: categories.length,
      },
    ]);
    setName("");
  };

  return (
    <section className="card">
      <h2>Catégories</h2>
      <ul className="chips">
        {categories.map((c) => (
          <li key={c.id} className={c.kind}>
            <button
              className="link"
              title="Renommer"
              onClick={() => {
                const next = prompt(
                  "Nouveau nom de la catégorie",
                  c.name,
                )?.trim();
                if (next && next !== c.name)
                  void update("categories", c.id, { name: next });
              }}
            >
              {c.name}
            </button>
            <button
              className="link"
              aria-label={`Supprimer ${c.name}`}
              onClick={() =>
                confirm(
                  `Supprimer « ${c.name} » ? Ses opérations repasseront « à classer ».`,
                ) && void remove("categories", c.id)
              }
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form className="filters" onSubmit={add}>
        <input
          placeholder="Nouvelle catégorie"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "depense" | "revenu")}
        >
          <option value="depense">Dépense</option>
          <option value="revenu">Revenu</option>
        </select>
        <button>Ajouter</button>
      </form>
      <h3>Revenus de fin de mois</h3>
      <p className="muted">
        Coche un revenu pour le compter dans le budget du mois suivant quand il
        arrive à partir du {LATE_DAY} du mois : un salaire versé fin octobre
        entre alors dans le budget de novembre.
      </p>
      {categories
        .filter((c) => c.kind === "revenu")
        .map((c) => (
          <label key={c.id} className="check">
            <input
              type="checkbox"
              checked={c.shift_next_month}
              onChange={(e) =>
                void update("categories", c.id, {
                  shift_next_month: e.target.checked,
                })
              }
            />
            {c.name}
          </label>
        ))}
    </section>
  );
}

function Rules() {
  const { rules, categories, insert, remove, applyRules } = useData();
  const [pattern, setPattern] = useState("");
  const [target, setTarget] = useState("transfer");
  const [message, setMessage] = useState<string | null>(null);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!pattern.trim()) return;
    void insert("rules", [
      {
        pattern: pattern.trim(),
        is_transfer: target === "transfer",
        category_id: target === "transfer" ? null : target,
      },
    ]);
    setPattern("");
  };

  return (
    <section className="card">
      <h2>Règles de classement</h2>
      <p className="muted">
        Une règle classe automatiquement, à l'import, toute opération dont le
        libellé contient le texte indiqué.
      </p>
      {rules.length > 0 && (
        <table>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>« {r.pattern} »</td>
                <td>
                  →{" "}
                  {r.is_transfer
                    ? "Virement interne"
                    : (categoryName.get(r.category_id ?? "") ?? "—")}
                </td>
                <td>
                  <button
                    className="ghost small"
                    onClick={() => void remove("rules", r.id)}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form className="filters" onSubmit={add}>
        <input
          placeholder="Le libellé contient…"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="transfer">↔ Virement interne</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button>Ajouter la règle</button>
        <button
          type="button"
          className="ghost"
          onClick={() =>
            void applyRules().then((n) =>
              setMessage(
                `${n} opération${n > 1 ? "s" : ""} classée${n > 1 ? "s" : ""}.`,
              ),
            )
          }
        >
          Appliquer aux opérations à classer
        </button>
      </form>
      {message && <p className="notice">{message}</p>}
    </section>
  );
}
