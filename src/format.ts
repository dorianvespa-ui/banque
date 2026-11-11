const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});
const eur0 = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const money = (n: number) => eur.format(n);
export const money0 = (n: number) => eur0.format(n);

const pad = (n: number) => String(n).padStart(2, "0");

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const currentMonth = () => today().slice(0, 7);

/** Décale un mois « AAAA-MM » de `delta` mois. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthLabel(month: string, short = false): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(
    "fr-FR",
    short ? { month: "short" } : { month: "long", year: "numeric" },
  );
}

export const dayLabel = (date: string) => {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
};
