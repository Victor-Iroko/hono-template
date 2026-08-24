import { getDb, getQueryClient } from "../core/db.js";
import { users } from "./models/index.js";

async function seed() {
  console.log("🌱 Seeding PostgreSQL database...");
  await getDb()
    .insert(users)
    .values([
      { email: "alice@example.com", name: "Alice Smith" },
      { email: "bob@example.com", name: "Bob Jones" },
    ])
    .onConflictDoNothing();
  console.log("✅ Seed completed.");
  await getQueryClient().end();
}

seed().catch((err: unknown) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
