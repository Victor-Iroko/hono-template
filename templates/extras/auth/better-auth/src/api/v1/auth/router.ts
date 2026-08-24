import { Hono } from "hono";
import { auth } from "../../../utils/auth.js";

export const authRouter = new Hono();

authRouter.on(["POST", "GET"], "/*", (c) => {
  return auth.handler(c.req.raw);
});
