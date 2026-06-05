const port = Number(process.env.PORT) || 3000;
const localServerUrl = `http://localhost:${port}`;

export const openapiDocumentation = {
  info: {
    title: "My API",
    version: "1.0.0",
    description: "My API Documentation",
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http" as const,
        scheme: "bearer",
      },
    },
  },
  security: [{ bearerAuth: [] }],
  servers: [
    { url: localServerUrl, description: "Local Server" },
    { url: "https://my-api.vercel.app/", description: "Test Server" },
  ],
};
