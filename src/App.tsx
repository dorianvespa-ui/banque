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
import Voyages from "./pages/Voyages";
import { configured, supabase } from "./supabase";
import { NavIcons } from "./ui";

const ROUTES = [
  "accueil",
  "perso",
  "joint",
  "voyages",
  "transactions",
  "patrimoine",
  "reglages",
] as const;
type Route = (typeof ROUTES)[number];

const TABS: { route: Route; label: string; icon: keyof typeof NavIcons }[] = [
  { route: "accueil", label: "Accueil", icon: "accueil" },
  { route: "perso", label: "Budgets", icon: "budgets" },
  { route: "voyages", label: "Voyages", icon: "voyages" },
  { route: "transactions", label: "Opérations", icon: "transactions" },
  { route: "patrimoine", label: "Patrimoine", icon: "patrimoine" },
  { route: "reglages", label: "Réglages", icon: "reglages" },
];

const routeFromHash = (): Route => {
  const id = location.hash.slice(1) as Route;
  return ROUTES.includes(id) ? id : "accueil";
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
          <h2>Nouveau mot de passe</h2>
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
  const [route, setRoute] = useState<Route>(routeFromHash);

  useEffect(() => {
    const onHash = () => {
      setRoute(routeFromHash());
      scrollTo(0, 0);
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const isBudget = route === "perso" || route === "joint";

  return (
    <>
      <main>
        {data.error && <p className="error">Erreur : {data.error}</p>}
        {data.loading ? (
          <p className="muted">Chargement…</p>
        ) : data.accounts.length === 0 && route !== "reglages" ? (
          <Onboarding />
        ) : route === "accueil" ? (
          <Dashboard />
        ) : isBudget ? (
          <Budget key={route} scope={route} />
        ) : route === "voyages" ? (
          <Voyages />
        ) : route === "transactions" ? (
          <Transactions />
        ) : route === "patrimoine" ? (
          <Patrimoine />
        ) : (
          <Reglages />
        )}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <a
            key={t.route}
            href={`#${t.route}`}
            className={
              t.route === route || (t.route === "perso" && isBudget)
                ? "active"
                : ""
            }
          >
            {NavIcons[t.icon]}
            {t.label}
          </a>
        ))}
      </nav>
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
