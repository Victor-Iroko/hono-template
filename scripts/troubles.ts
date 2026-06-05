export const KNOWN_TROUBLEMAKERS: Record<string, string> = {
  "hono-openapi":
    "Pulls in @standard-community/standard-json with a peer-dep conflict [38/37] that hangs bun 1.3.x on Windows. Workaround: pin to ^1.2.0 or run `bun install` manually after setup completes.",
  "better-auth":
    "May require git in PATH on Windows. If it fails, install git for Windows and retry.",
  "@sentry/node":
    "Has optional native profiling deps. If it fails, retry with `bun add @sentry/node --ignore-scripts`.",
};
