import { getDb, getSqlite } from "../core/db.js";
import * as schema from "./schema/index.js";

async function seed() {
  console.log("🌱 Seeding SQLite database...");
  if ("users" in schema && typeof (schema as Record<string, unknown>).users === "object") {
    const { users } = schema as { users: Parameters<ReturnType<typeof getDb>["insert"]>[0] };
    await getDb()
      .insert(users)
      .values([
        { id: "seed-user-1", email: "alice@example.com", name: "Alice Smith" },
        { id: "seed-user-2", email: "bob@example.com", name: "Bob Jones" },
      ]);
  }
  console.log("✅ SQLite seed completed.");
  getSqlite().close();
}

seed().catch((err: unknown) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
