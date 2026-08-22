process.env.APP_ENV = "test";
process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/myapp_test";
process.env.UPSTASH_REDIS_REST_URL ||= "http://localhost:8079";
process.env.UPSTASH_REDIS_REST_TOKEN ||= "local-dev-token";
process.env.JWT_SECRET ||= "test-jwt-secret-key-123456789012345";
