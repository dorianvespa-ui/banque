import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { DataProvider, useData } from "./data";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from "./defaults";
import Budget from "./pages/Budget";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import { PasswordForm } from "./pages/Password";
import Patrimoine from "./pages/Patrimoine";
import Reglages from "./pages/Reglages";
import Transactions from "./pages/Transactions";
import { configured, supabase } from "./supabase";

const TABS = [
  { id: "accueil", label: "Tableau de bord" },
  { id: "perso", label: "Budget perso" },
  { id: "joint", label: "Budget joint" },
  { id: "transactions", label: "Opérations" },
  { id: "patrimoine", label: "Patrimoine" },
  { id: "reglages", label: "Réglages" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const tabFromHash = (): TabId => {
  const id = location.hash.slice(1);
  return TABS.some((t) => t.id === id) ? (id as TabId) : "accueil";
};

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Vrai quand on arrive depuis le lien « mot de passe oublié » reçu par mail.
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!configured) return;
    void supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configured) {
    return (
      <main className="center">
        <div className="card">
          <h1>Configuration manquante</h1>
          <p>
            Copie <code>.env.example</code> en <code>.env</code> et renseigne
            l'adresse et la clé publique du projet Supabase, puis relance
            l'appli.
          </p>
        </div>
      </main>
    );
  }
  if (session === undefined) return null;
  if (!session) return <Login />;
  if (recovery) {
    return (
      <main className="center">
        <div className="card login">
          <h1>Nouveau mot de passe</h1>
          <PasswordForm onDone={() => setRecovery(false)} />
        </div>
      </main>
    );
  }
  return (
    <DataProvider key={session.user.id}>
      <Shell />
    </DataProvider>
  );
}

function Shell() {
  const data = useData();
  const [tab, setTab] = useState<TabId>(tabFromHash);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <header className="top">
        <strong>Mon budget</strong>
        <nav>
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className={t.id === tab ? "active" : ""}
            >
              {t.label}
            </a>
          ))}
        </nav>
        <button className="ghost" onClick={() => void supabase.auth.signOut()}>
          Déconnexion
        </button>
      </header>
      <main>
        {data.error && <p className="error">Erreur : {data.error}</p>}
        {data.loading ? (
          <p className="muted">Chargement…</p>
        ) : data.accounts.length === 0 && tab !== "reglages" ? (
          <Onboarding />
        ) : tab === "accueil" ? (
          <Dashboard />
        ) : tab === "perso" || tab === "joint" ? (
          <Budget key={tab} scope={tab} />
        ) : tab === "transactions" ? (
          <Transactions />
        ) : tab === "patrimoine" ? (
          <Patrimoine />
        ) : (
          <Reglages />
        )}
      </main>
    </>
  );
}

function Onboarding() {
  const data = useData();
  const [busy, setBusy] = useState(false);

  const init = async () => {
    setBusy(true);
    try {
      if (data.categories.length === 0)
        await data.insert("categories", DEFAULT_CATEGORIES);
      await data.insert("accounts", DEFAULT_ACCOUNTS);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h1>Bienvenue</h1>
      <p>
        Pour démarrer, je peux créer tes 9 comptes (Revolut, Crédit Agricole,
        Natixis) et une liste de catégories de départ. Tout reste modifiable
        dans les réglages.
      </p>
      <button disabled={busy} onClick={() => void init()}>
        Créer mes comptes et catégories
      </button>
    </div>
  );
}
