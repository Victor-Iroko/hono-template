import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as models from "../db/models/index.js";
import { relations } from "../db/relations.js";
import { getEnv } from "./env-validation.js";

export const schema = { ...models, ...relations };
export type DatabaseInstance = BetterSQLite3Database<typeof schema>;
export type Database = DatabaseInstance;
export type DrizzleTx = Parameters<Parameters<DatabaseInstance["transaction"]>[0]>[0];

let _sqlite: Database.Database | undefined;
let _db: DatabaseInstance | undefined;

export function getSqlite(): Database.Database {
  return (_sqlite ??= new Database(getEnv().DATABASE_URL || "sqlite.db"));
}

export function getDb(): DatabaseInstance {
  return (_db ??= drizzle(getSqlite(), { schema }));
}
