import fs from "fs";
import path from "path";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

import { authInterceptor } from "./interceptors/authInterceptor.js";
import { signHandler } from "./handlers/sign.handler.js";
import { healthHandler } from "./handlers/health.handler.js";

/* ---------- Load proto ---------- */

const PROTO_PATH = path.resolve("src/transport/grpc/proto/vault.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDef).vault;

/* ---------- Load certs ---------- */

const certDir = path.resolve("certs");

const ca = fs.readFileSync(path.join(certDir, "ca.crt"));
const cert = fs.readFileSync(path.join(certDir, "vault.crt"));
const key = fs.readFileSync(path.join(certDir, "vault.key"));

/* ---------- TLS credentials ---------- */

const credentials = grpc.ServerCredentials.createSsl(
  ca,
  [{ cert_chain: cert, private_key: key }],
  true
);

/* ---------- Server ---------- */

const server = new grpc.Server({
  "grpc.keepalive_time_ms": 30_000,
  "grpc.keepalive_timeout_ms": 10_000,
  "grpc.keepalive_permit_without_calls": 1
});

/* ---------- Register services ---------- */

server.addService(proto.VaultSigner.service, {
  health: healthHandler,
  sign: authInterceptor(signHandler)
});

/* ---------- Start ---------- */

server.bindAsync("0.0.0.0:50051", credentials, (err, port) => {
  if (err) {
    console.error("gRPC bind failed", err);
    process.exit(1);
  }

  console.log(`Vault gRPC listening on :${port}`);
});

/* ---------- Graceful shutdown ---------- */

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown() {
  console.log("Shutting down gRPC server...");
  server.tryShutdown(() => process.exit(0));
}
