import grpc from "@grpc/grpc-js";

export function createJwksHandler({ jwksService }) {
    return async function jwksHandler(call, callback) {
        try {
            const { domain } = call.request;
            if (!domain) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: "domain is required"
                });
            }
            const jwks = await jwksService.getJwks(domain);
            return callback(null, { jwks });
        } catch (err) {
            console.error("JWKS_FETCH_FAILED", err);
            return callback({
                code: grpc.status.INTERNAL,
                message: "Failed to fetch JWKS"
            });
        }
    }
}