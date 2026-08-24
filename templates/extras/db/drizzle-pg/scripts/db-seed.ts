import "dotenv/config";
import { getDb, getQueryClient } from "../src/core/db.js";
import { users } from "../src/db/models/index.js";

async function main() {
  console.log("🌱 Seeding database...");
  await getDb()
    .insert(users)
    .values([
      { email: "alice@example.com", name: "Alice Smith" },
      { email: "bob@example.com", name: "Bob Jones" },
    ])
    .onConflictDoNothing();
  console.log("✅ Database seeded successfully.");
  await getQueryClient().end();
}

main().catch((err: unknown) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
