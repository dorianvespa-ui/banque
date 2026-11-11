import { useState, type FormEvent } from "react";
import { LATE_DAY } from "../budget";
import { useData } from "../data";
import { supabase } from "../supabase";
import type { Account, AccountKind, Scope } from "../types";
import { CatIcon } from "../ui";
import { PasswordForm } from "./Password";

export default function Reglages() {
  return (
    <>
      <div className="page-head">
        <h1>Réglages</h1>
      </div>
      <Accounts />
      <Categories />
      <Rules />
      <section className="card">
        <h2>Mon compte</h2>
        <PasswordForm />
        <button
          className="danger"
          style={{ width: "100%", marginTop: 12 }}
          onClick={() => void supabase.auth.signOut()}
        >
          Se déconnecter
        </button>
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
      <p className="muted small">
        Pour chaque compte : son type, le budget dans lequel comptent ses
        opérations, et ta part dans le patrimoine (50 % pour un compte joint à
        deux).
      </p>
      <div className="rows">
        {accounts.map((a) => (
          <div
            className="row"
            key={a.id}
            style={{ gridTemplateColumns: "1fr auto" }}
          >
            <div className="main">
              <div className="title">{a.name}</div>
              <div className="muted small">{a.bank}</div>
            </div>
            <button
              className="ghost small"
              aria-label={`Supprimer ${a.bank} ${a.name}`}
              onClick={() =>
                confirm(
                  `Supprimer « ${a.bank} · ${a.name} » ainsi que ses opérations et ses soldes ?`,
                ) && void remove("accounts", a.id)
              }
            >
              ✕
            </button>
            <div className="account-fields" style={{ gridColumn: "1 / -1" }}>
              <select
                className="pill"
                value={a.kind}
                aria-label="Type"
                onChange={(e) =>
                  patch(a, { kind: e.target.value as AccountKind })
                }
              >
                <option value="courant">Courant</option>
                <option value="epargne">Épargne</option>
                <option value="placement">Placement</option>
              </select>
              <select
                className="pill"
                value={a.budget_scope ?? ""}
                aria-label="Budget"
                onChange={(e) =>
                  patch(a, {
                    budget_scope: (e.target.value || null) as Scope | null,
                  })
                }
              >
                <option value="">Hors budget</option>
                <option value="perso">Budget perso</option>
                <option value="joint">Budget joint</option>
              </select>
              <select
                className="pill"
                value={a.share}
                aria-label="Ma part"
                onChange={(e) => patch(a, { share: Number(e.target.value) })}
              >
                <option value={1}>Ma part : 100 %</option>
                <option value={0.5}>Ma part : 50 %</option>
              </select>
            </div>
          </div>
        ))}
      </div>
      <form className="filters" onSubmit={add} style={{ marginTop: 16 }}>
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
        <button>Ajouter</button>
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

  const chips = (k: "depense" | "revenu") => (
    <ul className="chips">
      {categories
        .filter((c) => c.kind === k)
        .map((c) => (
          <li key={c.id}>
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
              className="link x"
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
  );

  return (
    <section className="card">
      <h2>Catégories</h2>
      <p className="muted small">Touche un nom pour le modifier.</p>
      <h3>Dépenses</h3>
      {chips("depense")}
      <h3>Revenus</h3>
      {chips("revenu")}
      <form className="filters" onSubmit={add} style={{ marginTop: 16 }}>
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
      <p className="muted small">
        Un revenu coché compte dans le budget du mois suivant quand il arrive à
        partir du {LATE_DAY} : un salaire versé fin octobre entre dans le budget
        de novembre.
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
  const [exact, setExact] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!pattern.trim()) return;
    void insert("rules", [
      {
        pattern: pattern.trim(),
        exact,
        is_transfer: target === "transfer",
        category_id: target === "transfer" ? null : target,
      },
    ]);
    setPattern("");
  };

  return (
    <section className="card">
      <h2>Règles de classement</h2>
      <p className="muted small">
        Une règle classe automatiquement, à l'import, toute opération dont le
        libellé contient le texte indiqué, ou lui est exactement égal. Si
        plusieurs règles conviennent, la plus précise l'emporte.
      </p>
      {rules.length > 0 && (
        <details>
          <summary>
            Voir les {rules.length} règle{rules.length > 1 ? "s" : ""}
          </summary>
          <div className="rows" style={{ marginTop: 8 }}>
            {rules.map((r) => {
              const name = r.is_transfer
                ? "Virement interne"
                : (categoryName.get(r.category_id ?? "") ?? "—");
              return (
                <div className="row" key={r.id}>
                  {r.is_transfer ? (
                    <span
                      className="cat-icon"
                      style={{ "--hue": 225 } as React.CSSProperties}
                    >
                      ↔
                    </span>
                  ) : (
                    <CatIcon name={name} />
                  )}
                  <div className="main">
                    <div className="title">{r.pattern}</div>
                    <div className="muted small">
                      {r.exact ? "libellé exact" : "libellé contenant"} → {name}
                    </div>
                  </div>
                  <button
                    className="ghost small"
                    aria-label={`Supprimer la règle ${r.pattern}`}
                    onClick={() => void remove("rules", r.id)}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </details>
      )}
      <form className="filters" onSubmit={add} style={{ marginTop: 12 }}>
        <select
          value={exact ? "exact" : "contains"}
          onChange={(e) => setExact(e.target.value === "exact")}
          aria-label="Type de règle"
        >
          <option value="contains">Le libellé contient</option>
          <option value="exact">Le libellé est exactement</option>
        </select>
        <input
          placeholder="Texte du libellé"
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
      </form>
      <button
        type="button"
        className="ghost"
        style={{ width: "100%" }}
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
      {message && <p className="notice">{message}</p>}
    </section>
  );
}
