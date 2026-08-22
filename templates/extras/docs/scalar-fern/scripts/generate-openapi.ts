import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const { default: app } = await import("../src/index.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const res = await app.request("/openapi.json");
const spec = await res.json();

const fernDir = resolve(projectRoot, "fern");
mkdirSync(fernDir, { recursive: true });

const outPath = resolve(fernDir, "openapi.json");
writeFileSync(outPath, JSON.stringify(spec, null, 2));

console.log(`✅ OpenAPI spec written to ${outPath}`);
process.exit(0);
