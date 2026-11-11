import type { ReactNode } from "react";
import { monthLabel, shiftMonth } from "./format";

/** Niveau d'alerte d'une jauge selon la part du plafond consommée. */
export const toneOf = (ratio: number) =>
  ratio > 1 ? "over" : ratio > 0.85 ? "warn" : "";

export function MonthNav({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="month-nav">
      <button
        aria-label="Mois précédent"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        ‹
      </button>
      <span>{monthLabel(month)}</span>
      <button
        aria-label="Mois suivant"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        ›
      </button>
    </div>
  );
}

export function Bar({ ratio }: { ratio: number }) {
  return (
    <div className="bar">
      <div
        className={`fill ${toneOf(ratio)}`}
        style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }}
      />
    </div>
  );
}

/** Jauge circulaire : part du budget consommée. */
export function Ring({
  ratio,
  size = 76,
  children,
}: {
  ratio: number;
  size?: number;
  children?: ReactNode;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const part = Math.min(Math.max(ratio, 0), 1);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
        />
        <circle
          className={`ring-value ${toneOf(ratio)}`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={`${c * part} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}

const ICONS: [RegExp, string, number][] = [
  [/logement|loyer|maison/, "🏠", 28],
  [/course|aliment/, "🛒", 145],
  [/resto|restaurant|sortie/, "🍽️", 18],
  [/transport|voiture|essence|carbur/, "🚗", 210],
  [/abonnement/, "📺", 265],
  [/sante|soin|pharma/, "💊", 350],
  [/shopping|vetement/, "🛍️", 320],
  [/loisir|sport/, "🎯", 190],
  [/voyage|vacances/, "✈️", 200],
  [/impot|frais|banque/, "🧾", 45],
  [/joint|couple/, "👥", 240],
  [/salaire|paie/, "💼", 160],
  [/rembours|apport/, "🤝", 170],
  [/revenu|aide/, "💶", 130],
  [/epargne|invest/, "🌱", 120],
  [/divers|autre/, "📦", 30],
];

const plain = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Pastille colorée avec un pictogramme deviné d'après le nom de la catégorie. */
export function CatIcon({ name }: { name: string | null }) {
  if (name === null) {
    return (
      <span className="cat-icon todo" aria-hidden="true">
        ?
      </span>
    );
  }
  const found = ICONS.find(([re]) => re.test(plain(name)));
  const [, emoji, hue] = found ?? [null, "•", 225];
  return (
    <span
      className="cat-icon"
      style={{ "--hue": hue } as React.CSSProperties}
      aria-hidden="true"
    >
      {emoji}
    </span>
  );
}

const icon = (path: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

export const NavIcons = {
  accueil: icon(
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h13V10" />
    </>,
  ),
  budgets: icon(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5V12l6 6" />
    </>,
  ),
  transactions: icon(
    <>
      <path d="M8 7h12M8 12h12M8 17h12" />
      <path d="M4 7h.01M4 12h.01M4 17h.01" />
    </>,
  ),
  patrimoine: icon(
    <>
      <path d="M4 17l5-5 4 3 7-8" />
      <path d="M15 7h5v5" />
    </>,
  ),
  reglages: icon(
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>,
  ),
};
