import { Hono } from "hono";
import { getAuth } from "../../core/auth.js";

export const authRouter = new Hono();

authRouter.on(["POST", "GET"], "/*", (c) => {
  return getAuth().handler(c.req.raw);
});
