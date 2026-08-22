process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/myapp";
process.env.UPSTASH_REDIS_REST_URL ||= "http://localhost:8079";
process.env.UPSTASH_REDIS_REST_TOKEN ||= "local-dev-token";

await import("./serve.js");
