import { useState, type FormEvent } from "react";
import { appUrl, linkError, supabase } from "../supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState<string | null>(
    linkError &&
      "Ce lien n'est plus valable (déjà utilisé ou expiré). Connecte-toi, ou redemande un mail.",
  );
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { data, error } = signup
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: appUrl },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(
        error.code === "invalid_credentials"
          ? "Adresse mail ou mot de passe incorrect."
          : error.message,
      );
    } else if (signup && !data.session) {
      setMessage(
        "Si cette adresse n'a pas encore de compte, un mail de confirmation vient de partir : clique sur son lien. Si tu as déjà un compte, connecte-toi ou utilise « Mot de passe oublié ».",
      );
    }
    setBusy(false);
  };

  const forgot = async () => {
    if (!email) return setMessage("Saisis d'abord ton adresse mail.");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl,
    });
    setMessage(
      error
        ? error.message
        : "Si un compte existe pour cette adresse, un mail vient de partir : son lien te ramènera ici pour choisir un nouveau mot de passe.",
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
        {!signup && (
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={() => void forgot()}
          >
            Mot de passe oublié
          </button>
        )}
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
