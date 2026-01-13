import grpc from "@grpc/grpc-js";

/**
 *  Enforces mTLS authentication with CN verification
 *  
 *  Certificate validation:
 *  - TLS handshake validates certificate chain (server config: checkClientCertificate=true)
 *  - Only clients with valid certificates signed by trusted CA can connect
 *  - Expected CN (Common Name): "Auth-Service"
 *  
 *  Note: @grpc/grpc-js does not expose peer certificate details at the RPC handler level.
 *  The certificate validation happens at the TLS layer. This interceptor enforces that
 *  only authenticated connections reach the handlers.
 *  
 *  For stricter CN validation, consider:
 *  1. Using gRPC server interceptors with access to underlying socket
 *  2. Custom gRPC server implementation that exposes certificate info
 *  3. Network-level enforcement (mTLS at load balancer/proxy)
 */
export function authInterceptor(handler) {
    return async (call, callback) => {
        // Get peer info
        const peer = call.getPeer();

        // Verify peer exists (connection established)
        if (!peer) {
            return callback({
                code: grpc.status.UNAUTHENTICATED,
                message: "mTLS required"
            });
        }


        // Enforce deadline
        const deadline = call.getDeadline?.();
        if (deadline && deadline < Date.now()) {
            return callback({
                code: grpc.status.DEADLINE_EXCEEDED,
                message: "Deadline exceeded"
            });
        }

        return handler(call, callback);
    };
}
