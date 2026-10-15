import { createClient, type Client, type InStatement, type ResultSet } from "@libsql/client";

type Row = Record<string, unknown>;
export type QueryResult<T = Row> = { results: T[]; success: true; meta: { changes: number } };

export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Row>(column?: string): Promise<T | null>;
  all<T = Row>(): Promise<QueryResult<T>>;
  run(): Promise<QueryResult>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<QueryResult[]>;
}

let client: Client | undefined;
let store: Database | undefined;

export function databaseClient() {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("Database connection is not configured.");
  if (process.env.VERCEL && (url.startsWith("file:") || url === ":memory:")) {
    throw new Error("Vercel requires a remote database connection.");
  }
  client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN, intMode: "number" });
  return client;
}

const result = <T = Row>(value: ResultSet): QueryResult<T> => ({
  results: value.rows.map(row => Object.fromEntries(Object.entries(row))) as T[],
  success: true,
  meta: { changes: value.rowsAffected },
});

class PreparedStatement implements Statement {
  readonly owner: Client;
  readonly sql: string;
  readonly values: unknown[];
  constructor(owner: Client, sql: string, values: unknown[] = []) {
    this.owner = owner;
    this.sql = sql;
    this.values = values;
  }
  bind(...values: unknown[]) { return new PreparedStatement(this.owner, this.sql, values); }
  input(): InStatement { return { sql: this.sql, args: this.values as Exclude<InStatement, string>["args"] }; }
  async first<T = Row>(column?: string): Promise<T | null> {
    const row = result(await this.owner.execute(this.input())).results[0];
    return row ? (column ? row[column] : row) as T : null;
  }
  async all<T = Row>() { return result<T>(await this.owner.execute(this.input())); }
  async run() { return this.all(); }
}

export function database(): Database | undefined {
  if (!process.env.TURSO_DATABASE_URL) return undefined;
  if (store) return store;
  const owner = databaseClient();
  store = {
    prepare: sql => new PreparedStatement(owner, sql),
    async batch(statements) {
      const inputs = statements.map(statement => {
        if (!(statement instanceof PreparedStatement) || statement.owner !== owner) throw new Error("Invalid database statement.");
        return statement.input();
      });
      // libSQL commits the batch atomically; a failed statement rolls it back.
      return (await owner.batch(inputs, "write")).map(value => result(value));
    },
  };
  return store;
}
