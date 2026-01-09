// src/infrastructure/crypto/TokenBuilder.js

export class TokenBuilder {

    constructor(utils) {
        this.utils = utils;
    }

    /**
     * Main entry point to build the token parts.
     */
    build(payload, kid, options = {}, config = {}) {
        // 1. Validate
        this._validateInputs(payload, kid);

        // 2. Create Components
        const header = this._createHeader(kid);
        const finalPayload = this._createPayload(payload, options);

        // 3. Serialize & Check Size
        const jsonPayload = JSON.stringify(finalPayload);
        this._validateSize(jsonPayload, config.maxPayloadBytes);

        // 4. Encode
        return this._encode(header, jsonPayload);
    }

    // --- INTERNAL STEPS ---

    _validateInputs(payload, kid) {
        if (!kid || typeof kid !== 'string') {
            throw new Error('TokenBuilder: kid must be a non-empty string');
        }
        if (!this.utils.assertPlainObject(payload)) {
            throw new Error('TokenBuilder: payload must be a plain object');
        }
    }

    _createHeader(kid) {
        return {
            alg: 'RS256',
            typ: 'JWT',
            kid: kid
        };
    }

    _createPayload(payload, options) {
        const now = Math.floor(Date.now() / 1000);
        // default ttl is  30 * 24 * 60 * 60 ( 30days ) 
        const { ttlSeconds = 30 * 24 * 60 * 60, additionalClaims = {} } = options;

        const jwtPayload = {
            iat: now,
            ...additionalClaims,
            ...payload
        };

        // Auto-add expiration if missing
        if (!('exp' in jwtPayload)) {
            jwtPayload.exp = now + ttlSeconds;
        }

        return jwtPayload;
    }

    // maxBytes default to 4096 = 4KB
    _validateSize(jsonPayload, maxBytes = 4096) {
        const byteLen = (typeof Buffer !== 'undefined')
            ? Buffer.byteLength(jsonPayload)
            : new TextEncoder().encode(jsonPayload).length;

        if (byteLen > maxBytes) {
            throw new Error(`TokenBuilder: payload exceeds limit (${byteLen} > ${maxBytes})`);
        }
    }

    _encode(headerObj, jsonPayloadString) {
        const encoder = new TextEncoder();

        // Encode Header
        const headerBytes = encoder.encode(JSON.stringify(headerObj));
        const encodedHeader = this.utils.base64UrlEncode(new Uint8Array(headerBytes));

        // Encode Payload
        const payloadBytes = encoder.encode(jsonPayloadString);
        const encodedPayload = this.utils.base64UrlEncode(new Uint8Array(payloadBytes));

        return {
            encodedHeader,
            encodedPayload,
            signingInput: `${encodedHeader}.${encodedPayload}`,
            // Return these so domain can log them if needed
            iat: JSON.parse(jsonPayloadString).iat,
            exp: JSON.parse(jsonPayloadString).exp
        };
    }
}