/**
 * gRPC Health Check handler
 * Simple handler to verify mTLS connection
 */
export function healthHandler(call, callback) {
    const { ping } = call.request;

    console.log("HEALTH_CHECK received:", { ping });

    callback(null, {
        status: "OK",
        message: `Vault gRPC server is healthy. Received: ${ping || 'ping'}`
    });
}
