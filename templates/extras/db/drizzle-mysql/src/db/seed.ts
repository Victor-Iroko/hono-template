import { getDb, getPool } from "../core/db.js";
import { users } from "./models/index.js";

async function seed() {
  console.log("🌱 Seeding MySQL database...");
  await getDb()
    .insert(users)
    .values([
      { id: crypto.randomUUID(), email: "alice@example.com", name: "Alice Smith" },
      { id: crypto.randomUUID(), email: "bob@example.com", name: "Bob Jones" },
    ])
    .onDuplicateKeyUpdate({ set: { id: users.id } });
  console.log("✅ Seed completed.");
  await getPool().end();
}

seed().catch((err: unknown) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
