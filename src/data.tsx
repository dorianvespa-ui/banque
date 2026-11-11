import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ParsedTx } from "./csv";
import { supabase } from "./supabase";
import type {
  Account,
  Balance,
  Budget,
  Category,
  Rule,
  Scope,
  Tx,
} from "./types";

interface Tables {
  accounts: Account[];
  categories: Category[];
  budgets: Budget[];
  transactions: Tx[];
  rules: Rule[];
  balances: Balance[];
}
type TableName = keyof Tables;
type Row<T extends TableName> = Tables[T][number];

const EMPTY: Tables = {
  accounts: [],
  categories: [],
  budgets: [],
  transactions: [],
  rules: [],
  balances: [],
};

const ORDER: Record<TableName, string> = {
  accounts: "sort",
  categories: "sort",
  budgets: "id",
  transactions: "booked_on",
  rules: "created_at",
  balances: "as_of",
};

// Postgres renvoie les « numeric » sous forme de texte : on les convertit en nombres.
const NUMERIC = ["amount", "monthly_limit", "share"];
function fix<T>(row: T): T {
  const r = row as Record<string, unknown>;
  for (const k of NUMERIC) if (typeof r[k] === "string") r[k] = Number(r[k]);
  return row;
}

async function fetchAll<T extends TableName>(table: T): Promise<Row<T>[]> {
  const rows: Row<T>[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from(`budget_${table}`)
      .select("*")
      .order(ORDER[table], { ascending: table !== "transactions" })
      .order("id")
      .range(from, from + page - 1);
    if (error) throw error;
    rows.push(...(data as Row<T>[]).map(fix));
    if (data.length < page) return rows;
  }
}

export function matchRule(label: string, rules: Rule[]): Rule | undefined {
  const l = label.toLowerCase();
  return rules.find((r) => l.includes(r.pattern.toLowerCase()));
}

interface Store extends Tables {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  insert: <T extends TableName>(
    table: T,
    rows: Partial<Row<T>>[],
  ) => Promise<void>;
  update: <T extends TableName>(
    table: T,
    id: string,
    patch: Partial<Row<T>>,
  ) => Promise<void>;
  remove: (table: TableName, id: string) => Promise<void>;
  setBudget: (
    scope: Scope,
    categoryId: string,
    limit: number | null,
  ) => Promise<void>;
  setBalance: (
    accountId: string,
    asOf: string,
    amount: number,
  ) => Promise<void>;
  importTransactions: (
    accountId: string,
    parsed: ParsedTx[],
  ) => Promise<number>;
  applyRules: () => Promise<number>;
}

const Ctx = createContext<Store | null>(null);

export function useData(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("DataProvider manquant");
  return store;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<Tables>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const names = Object.keys(EMPTY) as TableName[];
      const results = await Promise.all(names.map((n) => fetchAll(n)));
      setTables(
        Object.fromEntries(
          names.map((n, i) => [n, results[i]]),
        ) as unknown as Tables,
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const store = useMemo<Store>(() => {
    // Toute erreur d'écriture est affichée dans le bandeau puis relancée à l'appelant.
    const run = async <R,>(
      p: PromiseLike<{ data: R; error: { message: string } | null }>,
    ): Promise<R> => {
      const { data, error } = await p;
      if (error) {
        setError(error.message);
        throw new Error(error.message);
      }
      setError(null);
      return data;
    };

    return {
      ...tables,
      loading,
      error,
      reload,

      async insert(table, rows) {
        await run(supabase.from(`budget_${table}`).insert(rows as never[]));
        await reload();
      },

      async update(table, id, patch) {
        await run(
          supabase
            .from(`budget_${table}`)
            .update(patch as never)
            .eq("id", id),
        );
        setTables((t) => ({
          ...t,
          [table]: t[table].map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
      },

      async remove(table, id) {
        await run(supabase.from(`budget_${table}`).delete().eq("id", id));
        // Une suppression peut en entraîner d'autres en cascade : on relit tout.
        await reload();
      },

      async setBudget(scope, categoryId, limit) {
        if (limit === null) {
          await run(
            supabase
              .from("budget_budgets")
              .delete()
              .eq("scope", scope)
              .eq("category_id", categoryId),
          );
        } else {
          await run(
            supabase
              .from("budget_budgets")
              .upsert(
                { scope, category_id: categoryId, monthly_limit: limit },
                { onConflict: "user_id,scope,category_id" },
              ),
          );
        }
        const budgets = await fetchAll("budgets");
        setTables((t) => ({ ...t, budgets }));
      },

      async setBalance(accountId, asOf, amount) {
        await run(
          supabase
            .from("budget_balances")
            .upsert(
              { account_id: accountId, as_of: asOf, amount },
              { onConflict: "account_id,as_of" },
            ),
        );
        const balances = await fetchAll("balances");
        setTables((t) => ({ ...t, balances }));
      },

      async importTransactions(accountId, parsed) {
        const rows = parsed.map((p) => {
          const rule = matchRule(p.label, tables.rules);
          return {
            ...p,
            account_id: accountId,
            category_id: rule?.category_id ?? null,
            is_transfer: rule?.is_transfer ?? false,
          };
        });
        let inserted = 0;
        for (let i = 0; i < rows.length; i += 500) {
          const data = await run(
            supabase
              .from("budget_transactions")
              .upsert(rows.slice(i, i + 500), {
                onConflict: "account_id,external_id",
                ignoreDuplicates: true,
              })
              .select("id"),
          );
          inserted += data?.length ?? 0;
        }
        await reload();
        return inserted;
      },

      async applyRules() {
        const todo = new Map<Rule, string[]>();
        for (const tx of tables.transactions) {
          if (tx.category_id || tx.is_transfer) continue;
          const rule = matchRule(tx.label, tables.rules);
          if (rule) todo.set(rule, [...(todo.get(rule) ?? []), tx.id]);
        }
        let count = 0;
        for (const [rule, ids] of todo) {
          for (let i = 0; i < ids.length; i += 200) {
            await run(
              supabase
                .from("budget_transactions")
                .update({
                  category_id: rule.category_id,
                  is_transfer: rule.is_transfer,
                })
                .in("id", ids.slice(i, i + 200)),
            );
          }
          count += ids.length;
        }
        if (count) await reload();
        return count;
      },
    };
  }, [tables, loading, error, reload]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
