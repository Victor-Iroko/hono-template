import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as models from "../db/models/index.js";
import { relations } from "../db/relations.js";
import { env } from "./env-validation.js";

export const schema = { ...models, ...relations };
export type Database = PostgresJsDatabase<typeof schema>;
export type DrizzleTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

let _db: Database | undefined;
let _client: postgres.Sql | undefined;

export function getQueryClient(): postgres.Sql {
  if (!_client) {
    const connectionString = env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/myapp";
    _client = postgres(connectionString);
  }
  return _client;
}

export function getDb(): Database {
  if (!_db) {
    _db = drizzle(getQueryClient(), { schema });
  }
  return _db;
}

export const db = new Proxy({} as Database, {
  get(_target, prop: string | symbol) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});
