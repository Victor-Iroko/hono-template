import { db } from "../core/db.js";
import { users } from "./models/index.js";

async function seed() {
  console.log("🌱 Seeding SQLite database...");
  await db
    .insert(users)
    .values([
      { id: crypto.randomUUID(), email: "alice@example.com", name: "Alice Smith" },
      { id: crypto.randomUUID(), email: "bob@example.com", name: "Bob Jones" },
    ])
    .onConflictDoNothing();
  console.log("✅ Seed completed.");
}

seed().catch((err: unknown) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
