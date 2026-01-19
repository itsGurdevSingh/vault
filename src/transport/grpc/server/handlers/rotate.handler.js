import grpc from "@grpc/grpc-js";

export const createRotateAllHandler = ({ rotatorService }) => {
    return async function rotateAllHandler(call, callback) {
        const start = Date.now();
        try {
            await rotatorService.rotateAllDomains();
            const durationMs = Date.now() - start;
            console.log("ROTATE_ALL_OK", { durationMs });
            return callback(null, {
                status: "success",
                message: `All domains rotated successfully in ${durationMs}ms`
            });
        } catch (err) {
            console.error("ROTATE_ALL_FAILED", err);
            return callback({
                code: grpc.status.INTERNAL,
                message: "Rotation of all domains failed"
            });
        }
    }
}

export const createRotateDomainHandler = ({ rotatorService }) => {
    return async function rotateDomainHandler(call, callback) {
        const start = Date.now();
        try {
            const { domain } = call.request;
            if (!domain) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: "domain is required"
                });
            }
            await rotatorService.rotateDomain(domain);
            const durationMs = Date.now() - start;
            console.log("ROTATE_DOMAIN_OK", { domain, durationMs });
            return callback(null, {
                status: "success",
                message: `Domain ${domain} rotated successfully in ${durationMs}ms`
            });
        } catch (err) {
            console.error("ROTATE_DOMAIN_FAILED", err);
            return callback({
                code: grpc.status.INTERNAL,
                message: "Rotation of domain failed"
            });
        }
    }
}
