# hono-setup

CLI that turns a freshly-scaffolded Hono project into the [hono-template](https://github.com/) — installs dependencies, writes the project structure, configures linting/formatting/pre-commit hooks, and patches `package.json` with the template's scripts.

The script lives at `scripts/setup.ts` and reads its targets from `scripts/stubs.ts`.

---

## Install (one-time)

`hono-setup` always operates on the current working directory, so `cd` into the target Hono project first.

### Windows (PowerShell) — recommended

Add a function to your PowerShell profile (`$PROFILE`, typically `~\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`):

```powershell
function hono-setup {
    & bun "C:\Users\USER\Desktop\Code\projects\hono-template\scripts\setup.ts" @args
}
```

Then `. $PROFILE` (or open a new terminal). This is the most reliable approach on Windows because `bun link` has a known bug ([oven-sh/bun#11319](https://github.com/oven-sh/bun/issues/11319)) that breaks bin metadata for packages whose `bin` field points to a relative `.ts` source file.

### macOS / Linux (bun link)

```bash
git clone https://github.com/<you>/hono-template
cd hono-template
bun install
bun link
```

After this, `hono-setup` is on your `PATH` (Bun adds the symlink to `~/.bun/bin`).

> If `bun link` fails on Linux with a permissions error, ensure your user owns `~/.bun/`.

---

## Usage

```bash
# 1. Scaffold a fresh Hono project
bun create hono@latest my-app
cd my-app

# 2. Apply the template setup to it
hono-setup                # full run
hono-setup --skip-deps    # skip bun add (deps already installed)
hono-setup --force        # overwrite existing files
hono-setup --dry-run      # preview changes
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

### `error: could not find bin metadata file` on Windows

You ran `bun link` from this repo, then tried `hono-setup` from a target project. This is a known Bun bug ([oven-sh/bun#11319](https://github.com/oven-sh/bun/issues/11319), [oven-sh/bun#28771](https://github.com/oven-sh/bun/issues/28771)) that affects `bin` fields pointing to relative `.ts` source files — the bin shim is created but its metadata file isn't, so Bun can't remap the call to the script's real location.

Fix: use the PowerShell profile function under [Install (one-time)](#install-one-time) instead of `bun link`. Then from the target project run `hono-setup` directly, or `bun <absolute-path-to-scripts\setup.ts>` as a fallback.

To clean up the broken state: `bun unlink` in this repo and delete the dangling `node_modules/hono-setup` junction from the target project.
