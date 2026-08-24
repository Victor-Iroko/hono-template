import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../db/schema/index.js";
import { getEnv } from "./env-validation.js";

export type DatabaseInstance = MySql2Database<typeof schema>;
export type Database = DatabaseInstance;
export type DrizzleTx = Parameters<Parameters<DatabaseInstance["transaction"]>[0]>[0];

let _pool: mysql.Pool | undefined;
let _db: DatabaseInstance | undefined;

export function getPool(): mysql.Pool {
  return (_pool ??= mysql.createPool(getEnv().DATABASE_URL || "mysql://root:password@localhost:3306/myapp"));
}

export function getDb(): DatabaseInstance {
  return (_db ??= drizzle(getPool(), { schema, mode: "default" }));
}
