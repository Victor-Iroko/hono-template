# hono-setup

CLI that turns a freshly-scaffolded Hono project into the [hono-template](https://github.com/) — installs dependencies, writes the project structure, configures linting/formatting/pre-commit hooks, and patches `package.json` with the template's scripts.

The script lives at `scripts/setup.ts` and reads its targets from `scripts/stubs.ts`.

---

## Install

`hono-setup` always operates on the current working directory, so `cd` into the target Hono project first.

```bash
bunx github:Victor-Iroko/hono-template
```

Same command on Windows, macOS, and Linux — no profile edit, no `bun link`.

- The repo is cloned and cached under Bun's temp directory on first run; subsequent runs are instant.
- To force a fresh download (e.g. after a template update): `bunx --no-cache github:Victor-Iroko/hono-template`.
- The repo must be public. For private access, configure git auth (`GIT_TOKEN` env or SSH key) — `bunx github:...` will then use it.

---

## Usage

```bash
# 1. Scaffold a fresh Hono project
bun create hono@latest my-app
cd my-app

# 2. Apply the template setup to it
bunx github:Victor-Iroko/hono-template                # full run
bunx github:Victor-Iroko/hono-template --skip-deps    # skip bun add (deps already installed)
bunx github:Victor-Iroko/hono-template --force        # overwrite existing files
bunx github:Victor-Iroko/hono-template --dry-run      # preview changes
```

### Flags

| Flag                              | Description                                                            |
| --------------------------------- | ---------------------------------------------------------------------- |
| `--force`                         | Overwrite existing files                                               |
| `--skip-deps`                     | Don't modify or install dependencies                                   |
| `--skip-install`                  | Write `package.json` but don't run the install                         |
| `--skip-auth-generate`            | Don't prompt for `better-auth generate`                                |
| `--strict`                        | Abort on first install failure (old behavior)                          |
| `--dry-run`                       | Print actions without writing anything                                 |
| `--package-manager <pm>`          | Use `bun` \| `npm` \| `pnpm` \| `yarn` (default: `bun`)                |
| `--install-timeout <seconds>`     | Override the 180s install timeout                                      |
| `-h`, `--help`                    | Show help                                                              |

---

## Prerequisites

- [Bun](https://bun.sh) 1.2+ (or the package manager you pass to `--package-manager`)
- Node.js 20+

Docker is optional — the script warns but doesn't fail if it's missing.

---

## See also

- `scripts/setup.ts` — the setup script itself (read it to see exactly what the template installs)
- `scripts/stubs.ts` — the file contents the setup script writes
- `scripts/troubles.ts` — hints for known-failing packages

---

## Troubleshooting

### Stale cache / not picking up template updates

`bunx` caches the cloned repo in a temp directory. To force a fresh download:

```bash
bunx --no-cache github:Victor-Iroko/hono-template
```

### Private repo

`bunx github:...` requires the repo to be reachable without authentication. For a private repo, configure git auth (`GIT_TOKEN` or SSH) before running the command.
