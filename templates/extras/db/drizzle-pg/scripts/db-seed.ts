import "dotenv/config";
import { getDb, getQueryClient } from "../src/core/db.js";
import * as schema from "../src/db/schema/index.js";

async function main() {
  console.log("🌱 Seeding database...");
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
  console.log("✅ Database seeded successfully.");
  await getQueryClient().end();
}

main().catch((err: unknown) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
