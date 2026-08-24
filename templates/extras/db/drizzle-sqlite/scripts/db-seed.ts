import "dotenv/config";
import { getDb, getSqlite } from "../src/core/db.js";
import * as schema from "../src/db/schema/index.js";

async function main() {
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
  console.log("✅ SQLite database seeded successfully.");
  getSqlite().close();
}

main().catch((err: unknown) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
