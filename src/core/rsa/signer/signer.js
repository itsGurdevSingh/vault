import { keyManager } from "../../internal/key-manager/keyManager.js";
import { pemToArrayBuffer, base64UrlEncode } from "./crypto-utils.js";
import { buildJWTParts } from "./jwt.js";

export class Signer {

    async sign(domain, payload = {}) {
        const { privateKey, kid } = await keyManager.getSigningKey(domain);

        if (!privateKey || !kid) {
            throw new Error("Signing key or kid is missing");
        }

        // Step 1: build header + payload
        const { encodedHeader, encodedPayload, signingInput } =
            buildJWTParts(payload, kid);

        // Step 2: import PKCS8 private key
        const cryptoKey = await crypto.subtle.importKey(
            "pkcs8",
            pemToArrayBuffer(privateKey),
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["sign"]
        );

        // Step 3: sign header.payload
        const encoder = new TextEncoder();
        const signatureBuffer = await crypto.subtle.sign(
            "RSASSA-PKCS1-v1_5",
            cryptoKey,
            encoder.encode(signingInput)
        );

        // Step 4: base64url signature
        const signature = base64UrlEncode(new Uint8Array(signatureBuffer));

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }
}
