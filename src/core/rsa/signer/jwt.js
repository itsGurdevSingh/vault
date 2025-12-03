import { base64UrlEncode } from "./crypto-utils.js";

export function buildJWTParts(payload, kid) {
    const now = Math.floor(Date.now() / 1000);

    const header = {
        alg: "RS256",
        typ: "JWT",
        kid
    };

    const finalPayload = {
        iat: now,
        ...payload
    };

    const encoder = new TextEncoder();

    const encodedHeader = base64UrlEncode(
        new Uint8Array(encoder.encode(JSON.stringify(header)))
    );

    const encodedPayload = base64UrlEncode(
        new Uint8Array(encoder.encode(JSON.stringify(finalPayload)))
    );

    return {
        encodedHeader,
        encodedPayload,
        signingInput: `${encodedHeader}.${encodedPayload}`,
    };
}
