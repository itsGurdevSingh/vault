import express from "express";
import { createJwksRoute } from "./routes/jwks.route.js";

export function startHttpServer({
  jwksService,
  port = 3000
}) {
  const app = express();

  // Basic hardening
  app.disable("x-powered-by");

  // Health check
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // JWKS endpoint (standard)
  app.get(
    "/jwks/:domain",
    createJwksRoute({ jwksService })
  );

  const server = app.listen(port, () => {
    console.log(`Vault HTTP server listening on :${port}`);
  });

  return server;
}
