process.env.API_BASE_URL ||= "http://localhost:3000";
process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/mydb";
process.env.REDIS_URL ||= "redis://localhost:6379";
process.env.APP_ENV ||= "development";

await import("./serve.js");
