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
  if (!_pool) {
    const connectionUri = env.DATABASE_URL || "mysql://root:password@localhost:3306/myapp";
    _pool = mysql.createPool(connectionUri);
  }
  return _pool;
}

export function getDb(): DatabaseInstance {
  if (!_db) {
    _db = drizzle(getPool(), { schema, mode: "default" });
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
