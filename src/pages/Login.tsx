import { useState, type FormEvent } from "react";
import { supabase } from "../supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { data, error } = signup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else if (signup && !data.session)
      setMessage(
        "Compte créé : confirme ton adresse via le mail reçu, puis connecte-toi.",
      );
    setBusy(false);
  };

  return (
    <main className="center">
      <form className="card login" onSubmit={(e) => void submit(e)}>
        <h1>Mon budget</h1>
        <label>
          Adresse mail
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            required
            minLength={8}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {message && <p className="muted">{message}</p>}
        <button disabled={busy}>
          {signup ? "Créer mon compte" : "Se connecter"}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => setSignup(!signup)}
        >
          {signup
            ? "J'ai déjà un compte"
            : "Première utilisation : créer un compte"}
        </button>
      </form>
    </main>
  );
}
