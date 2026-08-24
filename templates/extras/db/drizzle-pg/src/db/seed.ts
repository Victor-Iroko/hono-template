import { getDb, getQueryClient } from "../core/db.js";
import * as schema from "./schema/index.js";

async function seed() {
  console.log("🌱 Seeding PostgreSQL database...");
  if ("users" in schema && typeof (schema as Record<string, unknown>).users === "object") {
    const { users } = schema as { users: Parameters<ReturnType<typeof getDb>["insert"]>[0] };
    await getDb()
      .insert(users)
      .values([
        { email: "alice@example.com", name: "Alice Smith" },
        { email: "bob@example.com", name: "Bob Jones" },
      ])
      .onConflictDoNothing();
  }
  console.log("✅ Seed completed.");
  await getQueryClient().end();
}

seed().catch((err: unknown) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
