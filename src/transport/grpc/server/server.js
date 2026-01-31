import fs from "fs";
import path from "path";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

import { authInterceptor } from "./interceptors/authInterceptor.js";
import { createSignHandler, createJwksHandler, createHealthHandler, createRotateAllHandler, createRotateDomainHandler } from "./handlers/index.js";

/* ---------- Proto loader ---------- */

const PROTO_PATH = path.resolve("src/transport/grpc/proto/vault.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDef).vault;

/* ---------- Server factory ---------- */

export function startGrpcServer({ certDir, port = 50051, services: { jwksService, signerService, rotatorService } }) {
  return new Promise((resolve, reject) => {
    /* --- Load certs --- */
    const ca = fs.readFileSync(path.join(certDir, "ca.crt"));
    const cert = fs.readFileSync(path.join(certDir, "vault.crt"));
    const key = fs.readFileSync(path.join(certDir, "vault.key"));

    /* --- TLS credentials --- */
    const credentials = grpc.ServerCredentials.createSsl(
      ca,
      [{ cert_chain: cert, private_key: key }],
      true
    );

    /* --- Create server --- */
    const server = new grpc.Server({
      "grpc.keepalive_time_ms": 30_000,
      "grpc.keepalive_timeout_ms": 10_000,
      "grpc.keepalive_permit_without_calls": 1
    });

    /* --- Create handlers --- */
    const signHandler = createSignHandler({ signerService });
    const jwksHandler = createJwksHandler({ jwksService });
    const rotateAllHandler = createRotateAllHandler({ rotatorService });
    const rotateDomainHandler = createRotateDomainHandler({ rotatorService });
    const healthHandler = createHealthHandler();

    /* --- Register services --- */
    server.addService(proto.VaultSigner.service, {
      Health: healthHandler,
      Sign: authInterceptor(signHandler),
      Jwks: authInterceptor(jwksHandler),
      RotateAll: authInterceptor(rotateAllHandler),
      RotateDomain: authInterceptor(rotateDomainHandler)
    });

    /* --- Start server --- */
    server.bindAsync(`0.0.0.0:${port}`, credentials, (err, boundPort) => {
      if (err) {
        return reject(err);
      }

      resolve({ server, port: boundPort });
    });
  });
}
