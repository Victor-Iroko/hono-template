import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { relations } from "../db/relations.js";
import env from "./env.js";

if (env.APP_ENV === "development" && !process.env.VERCEL) {
  neonConfig.wsProxy = (host: string, port: string | number) => `${host}:${port}/v2`;
  neonConfig.useSecureWebSocket = false;
}

const client = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle({ client, schema: relations });
