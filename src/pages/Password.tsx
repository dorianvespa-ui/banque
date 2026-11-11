import { useState, type FormEvent } from "react";
import { supabase } from "../supabase";

/** Choix d'un nouveau mot de passe pour le compte connecté. */
export function PasswordForm({ onDone }: { onDone?: () => void }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMessage(error.message);
    setPassword("");
    setMessage("Mot de passe modifié.");
    onDone?.();
  };

  return (
    <form className="password" onSubmit={(e) => void submit(e)}>
      <input
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Nouveau mot de passe (8 caractères min.)"
        aria-label="Nouveau mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button disabled={busy}>Enregistrer</button>
      {message && <p className="muted">{message}</p>}
    </form>
  );
}
