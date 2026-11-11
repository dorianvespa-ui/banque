# Mon budget

Tableau de bord personnel : deux budgets distincts (perso et compte joint), classement des
opérations bancaires et suivi du patrimoine. Appli web React + Supabase.

## Fonctionnement

- **Tableau de bord** : vue d'ensemble du mois (reste à dépenser de chaque budget, dépassements,
  principales dépenses, patrimoine).
- **Budget perso / Budget joint** : revenus, dépenses et plafonds mensuels par catégorie, pour les
  comptes rattachés à chaque budget. Les virements internes sont exclus.
- **Voyages** : un budget par voyage, financé par l'épargne. Les opérations rattachées à un voyage
  (remboursements compris) sortent des plafonds du mois.
- **Opérations** : import des relevés CSV (Revolut, Crédit Agricole), sans doublon en cas de
  réimport, puis classement par catégorie. Les règles classent automatiquement les libellés connus.
- **Patrimoine** : saisie du solde de chaque compte (épargne, PEA, assurance vie, PEE…) et évolution
  sur 12 mois. Un compte joint ne compte que pour ma part.
- **Réglages** : comptes, catégories et règles.

La synchronisation automatique avec les banques n'est pas encore branchée : les opérations
arrivent par import CSV.

## Installation

La base est déjà installée dans le projet Supabase « My Auditmed » (tables préfixées `budget_`,
à côté de celles de l'autre appli). Les comptes utilisateurs sont communs aux deux applis.

1. Copier `.env.example` en `.env`.
2. Lancer :

```bash
npm install
npm run dev     # appli en local
npm test        # tests de l'import CSV
npm run build   # version de production dans dist/
```

Les données sont protégées par la sécurité au niveau des lignes : chaque utilisateur ne voit que
les siennes. Pour réinstaller la base ailleurs, appliquer `supabase/migrations/0001_init.sql`.
