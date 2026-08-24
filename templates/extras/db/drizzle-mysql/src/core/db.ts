import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as models from "../db/models/index.js";
import { relations } from "../db/relations.js";
import { env } from "./env-validation.js";

export const schema = { ...models, ...relations };
export type DatabaseInstance = MySql2Database<typeof schema>;
export type DrizzleTx = Parameters<Parameters<DatabaseInstance["transaction"]>[0]>[0];

let _pool: mysql.Pool | undefined;
let _db: DatabaseInstance | undefined;

export function getPool(): mysql.Pool {
  return (_pool ??= mysql.createPool(env.DATABASE_URL || "mysql://root:password@localhost:3306/myapp"));
}

export function getDb(): DatabaseInstance {
  return (_db ??= drizzle(getPool(), { schema, mode: "default" }));
}

export const db = new Proxy({} as DatabaseInstance, {
  get(_, prop: string | symbol) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});
