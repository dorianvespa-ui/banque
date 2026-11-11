# Mon budget

Tableau de bord personnel : deux budgets distincts (perso et compte joint), classement des
opérations bancaires et suivi du patrimoine. Appli web React + Supabase.

## Fonctionnement

- **Budget perso / Budget joint** : revenus, dépenses et plafonds mensuels par catégorie, pour les
  comptes rattachés à chaque budget. Les virements internes sont exclus.
- **Opérations** : import des relevés CSV (Revolut, Crédit Agricole), sans doublon en cas de
  réimport, puis classement par catégorie. Les règles classent automatiquement les libellés connus.
- **Patrimoine** : saisie du solde de chaque compte (épargne, PEA, assurance vie, PEE…) et évolution
  sur 12 mois. Un compte joint ne compte que pour ma part.
- **Réglages** : comptes, catégories et règles.

La synchronisation automatique avec les banques n'est pas encore branchée : les opérations
arrivent par import CSV.

## Installation

1. Appliquer `supabase/migrations/0001_init.sql` sur le projet Supabase.
2. Copier `.env.example` en `.env` et renseigner l'adresse et la clé publique du projet.
3. Lancer :

```bash
npm install
npm run dev     # appli en local
npm test        # tests de l'import CSV
npm run build   # version de production dans dist/
```

Les données sont protégées par la sécurité au niveau des lignes : chaque utilisateur ne voit que
les siennes. Une fois ton compte créé, désactive les inscriptions dans Supabase
(Authentication → Sign In / Providers) pour que l'appli reste privée.
