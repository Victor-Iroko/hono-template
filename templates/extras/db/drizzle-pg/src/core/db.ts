import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as models from "../db/models/index.js";
import { relations } from "../db/relations.js";
import { getEnv } from "./env-validation.js";

export const schema = { ...models, ...relations };
export type Database = PostgresJsDatabase<typeof schema>;
export type DatabaseInstance = Database;
export type DrizzleTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

let _db: Database | undefined;
let _client: postgres.Sql | undefined;

export function getQueryClient(): postgres.Sql {
  return (_client ??= postgres(getEnv().DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/myapp"));
}

export function getDb(): Database {
  return (_db ??= drizzle(getQueryClient(), { schema }));
}
