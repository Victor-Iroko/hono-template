import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as models from "../db/models/index.js";
import { relations } from "../db/relations.js";
import { env } from "./env-validation.js";

export const schema = { ...models, ...relations };
export type DatabaseInstance = BetterSQLite3Database<typeof schema>;
export type DrizzleTx = Parameters<Parameters<DatabaseInstance["transaction"]>[0]>[0];

let _sqlite: Database.Database | undefined;
let _db: DatabaseInstance | undefined;

export function getSqlite(): Database.Database {
  if (!_sqlite) {
    const dbPath = env.DATABASE_URL || "sqlite.db";
    _sqlite = new Database(dbPath);
  }
  return _sqlite;
}

export function getDb(): DatabaseInstance {
  if (!_db) {
    _db = drizzle(getSqlite(), { schema });
  }
  return _db;
}

export const db = new Proxy({} as DatabaseInstance, {
  get(_target, prop: string | symbol) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});
