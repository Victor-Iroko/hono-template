import "dotenv/config";
import { getDb } from "../src/core/db.js";
import { users } from "../src/db/models/index.js";

async function main() {
  console.log("🌱 Seeding database...");
  await getDb()
    .insert(users)
    .values([
      { id: crypto.randomUUID(), email: "alice@example.com", name: "Alice Smith" },
      { id: crypto.randomUUID(), email: "bob@example.com", name: "Bob Jones" },
    ])
    .onConflictDoNothing();
  console.log("✅ Database seeded successfully.");
}

main().catch((err: unknown) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
