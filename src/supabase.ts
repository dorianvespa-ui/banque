import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

/** Adresse de l'appli, vers laquelle les liens reçus par mail doivent ramener. */
export const appUrl = location.origin + location.pathname;

/** Message d'erreur transmis par un lien de mail invalide ou expiré, lu avant que le client ne nettoie l'adresse. */
export const linkError = new URLSearchParams(location.hash.slice(1)).get(
  "error_description",
);

export const configured = Boolean(url && key);
export const supabase = createClient(
  url ?? "http://localhost",
  key ?? "missing",
);
