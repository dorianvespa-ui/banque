import Papa from "papaparse";

export interface ParsedTx {
  booked_on: string;
  amount: number;
  label: string;
  external_id: string;
}

/** Les exports Crédit Agricole sont souvent en Windows-1252, ceux de Revolut en UTF-8. */
export function decodeFile(buf: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

export function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  let s = raw.replace(/[\s  €+]/g, "");
  if (!s) return null;
  const comma = s.lastIndexOf(",");
  const dot = s.lastIndexOf(".");
  if (comma > dot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function detectDelimiter(text: string): string {
  const lines = text.split("\n").length;
  const count = (c: string) => text.split(c).length - 1;
  if (count(";") >= lines) return ";";
  if (count("\t") >= lines) return "\t";
  return ",";
}

const IGNORED_STATE = /revert|declin|fail|pending|annul|refus|attente|echou/;

/**
 * Lit un relevé CSV de banque (Revolut, Crédit Agricole et formats proches) :
 * repère la ligne d'en-têtes, puis les colonnes date / libellé / montant
 * (ou débit + crédit) d'après leur nom.
 */
export function parseStatement(text: string): ParsedTx[] {
  const { data } = Papa.parse<string[]>(text.replace(/^﻿/, ""), {
    delimiter: detectDelimiter(text),
    skipEmptyLines: true,
  });

  const find = (h: string[], ...keys: string[]) =>
    h.findIndex((c) => keys.some((k) => c.includes(k)));

  let headerIdx = -1;
  let h: string[] = [];
  for (let i = 0; i < data.length; i++) {
    h = data[i].map(norm);
    const hasAmount = find(h, "amount", "montant", "debit", "credit") >= 0;
    if (find(h, "date") >= 0 && hasAmount) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0)
    throw new Error(
      "Colonnes « date » et « montant » introuvables dans ce fichier.",
    );

  const dateCols = h
    .map((c, i) => (c.includes("date") ? i : -1))
    .filter((i) => i >= 0);
  const preferred = dateCols.find(
    (i) => h[i].includes("completed") || h[i].includes("fin"),
  );
  if (preferred !== undefined) dateCols.unshift(preferred);
  const labelCol = find(h, "description", "libelle", "label", "detail");
  const amountCol = find(h, "amount", "montant");
  const debitCol = find(h, "debit");
  const creditCol = find(h, "credit");
  const feeCol = find(h, "fee", "frais");
  const stateCol = find(h, "state", "etat");

  const seen = new Map<string, number>();
  const out: ParsedTx[] = [];
  for (const row of data.slice(headerIdx + 1)) {
    if (stateCol >= 0 && IGNORED_STATE.test(norm(row[stateCol] ?? "")))
      continue;
    let date: string | null = null;
    for (const c of dateCols) if ((date = parseDate(row[c]))) break;
    if (!date) continue;

    let amount: number | null;
    if (amountCol >= 0) {
      amount = parseAmount(row[amountCol]);
    } else {
      const debit = parseAmount(row[debitCol]);
      const credit = parseAmount(row[creditCol]);
      amount =
        debit === null && credit === null
          ? null
          : (credit ?? 0) - Math.abs(debit ?? 0);
    }
    if (amount === null) continue;
    if (feeCol >= 0) amount -= Math.abs(parseAmount(row[feeCol]) ?? 0);
    amount = Math.round(amount * 100) / 100;
    if (amount === 0) continue;

    const label =
      (row[labelCol] ?? "").replace(/\s+/g, " ").trim() || "(sans libellé)";
    // Deux opérations identiques le même jour restent distinctes grâce au compteur.
    const key = `${date}|${amount}|${label}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    out.push({ booked_on: date, amount, label, external_id: `${key}|${n}` });
  }
  return out;
}
