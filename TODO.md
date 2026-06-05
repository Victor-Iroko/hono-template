# TODO

## Immediate

- [ ] Set production `BETTER_AUTH_SECRET` (run: `openssl rand -base64 32`)
- [ ] Configure `SENTRY_DSN` if using Sentry
- [ ] Replace `my-api` / `my-app` / `mydb` placeholders with your project names
- [ ] Define your first domain models under `src/db/models/`
- [ ] Add your first route under `src/api/v1/`
- [ ] Update `src/core/openapi-config.ts` (title, version, server URLs)
- [ ] Update `service` field in `src/core/logger.ts`

## Optional

- [ ] Run `bunx fern init` to set up API docs publishing
- [ ] Run `bunx @better-auth/cli@latest generate` to refresh auth schema
- [ ] Add a `CHANGELOG.md`
- [ ] Add a `CONTRIBUTING.md`
- [ ] Configure TypeDoc for generated code docs
