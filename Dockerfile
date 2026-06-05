FROM oven/bun:1 AS install

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build

WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1-slim

WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 3000

CMD ["bun", "run", "dist/serve.js"]
