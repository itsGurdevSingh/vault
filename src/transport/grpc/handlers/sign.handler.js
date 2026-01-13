import grpc from "@grpc/grpc-js";
import { manager as keyManager } from "../../../domain/key-manager/index.js";

/**
 * gRPC Sign RPC handler
 * Responsibilities:
 *  - validate request shape
 *  - call domain
 *  - map errors to gRPC status codes
 */
export async function signHandler(call, callback) {
  const start = Date.now();

  try {
    const { domain, payload } = call.request;

    if (!domain || !payload) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: "domain and payload are required"
      });
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: "payload must be valid JSON"
      });
    }

    const token = await keyManager.sign(domain, parsedPayload);

    console.log("SIGN_OK", {
      domain,
      durationMs: Date.now() - start
    });

    return callback(null, { token });

  } catch (err) {
    console.error("SIGN_FAILED", err);

    return callback({
      code: grpc.status.INTERNAL,
      message: "Signing failed"
    });
  }
}
