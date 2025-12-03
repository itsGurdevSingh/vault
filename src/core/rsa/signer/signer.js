import { keyManager } from "../../internal/key-manager/keyManager.js";
import { pemToArrayBuffer, base64UrlEncode } from "./crypto-utils.js";
import { buildJWTParts } from "./jwt.js";

export class Signer {
    constructor() {
        this.cache = null; //(domain → kid → cryptoKey)
    }

    /**
     * Sign payload using domain’s currently active signing key.
     * Ensures:
     *  - Domain → active kid check
     *  - Cached cryptoKey reused when kid matches
     *  - Cache invalidated automatically when kid rotates
     */
    async sign(domain, payload = {}) {
        if (!domain) {
            throw new Error("Signer: domain is required");
        }

        // -------------------------------
        // 1. Fetch active signing key for domain
        // -------------------------------
        const { privateKey, kid } = await keyManager.getSigningKey(domain);

        if (!privateKey || !kid) {
            throw new Error(
                `Signer: KeyManager returned invalid signing material for domain "${domain}".`
            );
        }

        // -------------------------------
        // 2. Prepare signing input (header + payload)
        // -------------------------------
        const { encodedHeader, encodedPayload, signingInput } =
            buildJWTParts(payload, kid);

        // -------------------------------
        // 3. Resolve cryptoKey (cached or fresh)
        // -------------------------------
        const cryptoKey = await this._getOrCreateCryptoKey(domain, kid, privateKey);

        // -------------------------------
        // 4. Sign the header.payload
        // -------------------------------
        const encoder = new TextEncoder();
        const signatureBuffer = await crypto.subtle.sign(
            "RSASSA-PKCS1-v1_5",
            cryptoKey,
            encoder.encode(signingInput)
        );

        // -------------------------------
        // 5. Base64URL signature
        // -------------------------------
        const signature = base64UrlEncode(new Uint8Array(signatureBuffer));

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    /**
     * Resolve cryptoKey:
     *  - If kid matches and exists in cache → reuse
     *  - If kid is new → clear old kid & create new cryptoKey
     */
    async _getOrCreateCryptoKey(domain, kid, privateKey) {
        if (!this.cache) {
            return this._importPrivateKey(privateKey);
        }

        const domainCache = this.cache.get(domain) || {};

        // Cache hit
        if (domainCache.kid === kid && domainCache.cryptoKey) {
            return domainCache.cryptoKey;
        }

        // Cache miss OR kid rotated → invalidate and rebuild
        const cryptoKey = await this._importPrivateKey(privateKey);

        this.cache.set(domain, {
            kid,
            cryptoKey,
        });

        return cryptoKey;
    }

    /**
     * Convert PEM → ArrayBuffer → CryptoKey
     */
    async _importPrivateKey(pem) {
        return crypto.subtle.importKey(
            "pkcs8",
            pemToArrayBuffer(pem),
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["sign"]
        );
    }

    /**
     * Public method for orchestrator/janitor to clear cache safely.
     */
    clearCache(domain = null) {
        if (!this.cache) return;

        if (domain) {
            this.cache.delete(domain);
        } else {
            this.cache.clear();
        }
    }

    /** Clear full cache */
    clearFullCache() {
        this.cache = null;
    }
}
