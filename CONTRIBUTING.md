# Contributing to Create Hono Stack 🚀

Thank you for your interest in contributing to **Create Hono Stack**! This document provides guidelines and instructions for setting up your development environment, understanding the project architecture, testing your changes, and adding new features or installers.

---

## 🧭 Architecture Overview

Create Hono Stack uses the **Composable Installers Pattern** (similar to `create-t3-app`):

1. **[`src/cli/`](./src/cli)**: Handles user interaction via `@clack/prompts` (interactive wizard) and `commander` (CLI flags for automated/CI scaffolding).
2. **[`templates/`](./templates)**: Real source templates on disk with full TypeScript syntax highlighting and type safety (no monolithic string stubs).
   - `templates/base/`: Minimal base Hono apps for each runtime target (`bun`, `node`, `cloudflare-workers`).
   - `templates/extras/`: Modular feature folders (database, auth, redis, observability, email, storage, tooling).
3. **[`src/installers/`](./src/installers)**: Modular installer functions that copy template files, merge dependencies into `package.json`, append `.env` variables, and inject middleware/routes into `src/index.ts`.
4. **[`src/utils/`](./src/utils)**: Reusable helpers for file system operations, safe `package.json` merging, `.env` file management, and marker-based code injection.

---

## 🛠️ Local Development Setup

### Prerequisites

- [Bun](https://bun.sh) 1.2+
- Node.js 20+ (optional, for testing Node runtime target)
- Docker & Docker Compose (optional, for testing generated backing services)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Victor-Iroko/hono-template.git
cd hono-template
bun install
```

### Useful Scripts

| Command | Description |
| :--- | :--- |
| `bun run typecheck` | Run TypeScript type checking (`tsc --noEmit`) |
| `bun test` | Run the complete automated test suite |
| `bun src/index.ts <project-name>` | Run the CLI generator locally |

---

## 🧪 Testing Your Changes

### 1. Interactive Preview (`--dry-run`)

Test prompts and CLI flow without writing or modifying any files:

```bash
bun src/index.ts test-app --dry-run
```

### 2. Scaffold a Local Test Project

Generate a real project to inspect the output files, dependencies, and code injections (use `--no-install` to skip downloading packages for fast iteration):

```bash
# Interactive mode
bun src/index.ts test-app --no-install

# Or flag-driven mode
bun src/index.ts test-app \
  --runtime bun \
  --db postgres \
  --auth better-auth \
  --redis upstash \
  --observability otel \
  --docs scalar-fern \
  --email nodemailer \
  --storage s3 \
  --linter oxlint \
  --no-install \
  --non-interactive
```

After inspecting the generated project, remove the test folder:

```bash
# On Linux/macOS
rm -rf test-app

# On Windows PowerShell
Remove-Item -Recurse -Force test-app
```

### 3. Run Automated Tests

The test suite runs end-to-end scaffolding pipelines into temporary directories and asserts that files, dependencies, environment variables, and code injections are applied correctly:

```bash
bun test
```

---

## ➕ How to Add a New Feature / Installer

To add a new selectable module (e.g. Stripe billing, WebSocket support, new ORM, etc.):

### Step 1: Add Template Files
Create a new folder under `templates/extras/<category>/<feature-name>/` containing the TypeScript source files and configuration for your feature.

### Step 2: Define Options & Types
Update [`src/cli/types.ts`](./src/cli/types.ts) with the new choice type, and add it to `ProjectOptions` and `CliFlags`.

### Step 3: Add Interactive Prompts & Flags
1. In [`src/cli/prompts.ts`](./src/cli/prompts.ts), add a prompt step using `p.select` or `p.confirm`.
2. In [`src/cli/flags.ts`](./src/cli/flags.ts), add corresponding CLI options (e.g. `--billing <provider>`).

### Step 4: Implement the Installer
Create a new file in `src/installers/<feature-name>.ts`:

```typescript
import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { appendEnvVars } from "../utils/env.js";
import { injectAtMarker } from "../utils/injector.js";

export async function installMyFeature(ctx: InstallerContext): Promise<void> {
  if (ctx.options.myFeature === "none") return;

  const sourceDir = join(ctx.templateRoot, "extras", "my-feature");
  await copyTemplateDir(sourceDir, ctx.projectDir);

  await mergePackageJson(ctx.projectDir, {
    dependencies: {
      "my-package": "^1.0.0",
    },
  });

  await appendEnvVars(ctx.projectDir, {
    env: { MY_FEATURE_KEY: "secret_123" },
    example: { MY_FEATURE_KEY: "" },
    comments: ["My Feature Configuration"],
  });

  await injectAtMarker(
    ctx.projectDir,
    "src/index.ts",
    "// [INSTALLER:ROUTES]",
    'app.route("/my-feature", myFeatureRouter);'
  );
}
```

### Step 5: Register the Installer
Add your new installer function to [`src/installers/index.ts`](./src/installers/index.ts). If the feature requires a local container, update [`src/installers/docker.ts`](./src/installers/docker.ts).

### Step 6: Add Tests
Add test cases in [`tests/scaffold.test.ts`](./tests/scaffold.test.ts) verifying that the new feature scaffolds properly and merges all dependencies.

---

## 📏 Code Guidelines

1. **No `any` types**: All TypeScript code must be strictly and explicitly typed.
2. **Keep files concise & split**: Favor small, focused modules over long, monolithic files.
3. **Template Integrity**: Ensure template source files in `templates/` remain valid, clean TypeScript with correct relative imports.
4. **Test Before Submitting**: Always run `bun run typecheck` and `bun test` before pushing changes.

---

## 📜 Pull Request Process

1. Fork the repository and create a feature branch (`git checkout -b feature/amazing-feature`).
2. Implement your changes following the guidelines above.
3. Run `bun run typecheck` and `bun test` to ensure all tests pass.
4. Commit your changes with clear commit messages.
5. Push to your branch and open a Pull Request.

---

## 🤖 Built with AI & Tooling

This project and its codebase were designed and built using AI. Contributions built using AI tools (such as Claude, ChatGPT, Gemini, Copilot, Cursor, Antigravity, etc.) are fully welcome, provided all tests pass, types are strictly checked with zero `any`, and files maintain clean modular separation.
