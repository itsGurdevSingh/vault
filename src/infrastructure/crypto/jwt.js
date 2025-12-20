// src/core/signer/jwt.js
import { KEY_PUBLIC_TTL_MS } from '../../../config/keys.js';
import { base64UrlEncode } from './crypto-utils.js';
import { ValidationError, PayloadTooLargeError } from './errors.js';

const DEFAULT_MAX_PAYLOAD_BYTES = 4 * 1024; // 4KB

function assertPlainObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Build header/payload encoded parts.
 * options:
 *   - kid (string) REQUIRED
 *   - ttlSeconds (number) default 300
 *   - additionalClaims: object (optional) -- merged into payload but won't override iat/exp
 *   - maxPayloadBytes: number
 */
export function buildJWTParts(payload, kid, opts = {}) {
    const { ttlSeconds = 300, additionalClaims = {}, maxPayloadBytes = DEFAULT_MAX_PAYLOAD_BYTES } = opts;

    if (!kid || typeof kid !== 'string') throw new ValidationError('kid must be a non-empty string');
    if (!assertPlainObject(payload)) throw new ValidationError('payload must be a plain object');

    // add standard claims
    const now = Math.floor(Date.now() / 1000);
    const finalPayload = {
        iat: now,
        ...additionalClaims,
        ...payload
    };

    // add exp if not present
    if (!('exp' in finalPayload)) {
        finalPayload.exp = now + ttlSeconds;
    }
    else {
        // validate exp
        if (typeof finalPayload.exp !== 'number' || finalPayload.exp <= now) {
            throw new ValidationError('exp claim must be a number in the future');
        }

        // enforce max TTL for public keys
        const maxExp = KEY_PUBLIC_TTL_MS / 1000;
        if (finalPayload.exp - now > maxExp) {
            throw new ValidationError(`exp claim exceeds maximum allowed TTL of ${maxExp} seconds`);
        }
    }

    // size guard
    const json = JSON.stringify(finalPayload);
    const byteLen = Buffer.byteLength ? Buffer.byteLength(json) : new TextEncoder().encode(json).length;
    if (byteLen > maxPayloadBytes) {
        throw new PayloadTooLargeError(`payload exceeds limit: ${byteLen} bytes (max ${maxPayloadBytes})`);
    }

    const header = {
        alg: 'RS256',
        typ: 'JWT',
        kid
    };

    const encoder = new TextEncoder();
    const encodedHeader = base64UrlEncode(new Uint8Array(encoder.encode(JSON.stringify(header))));
    const encodedPayload = base64UrlEncode(new Uint8Array(encoder.encode(json)));

    return {
        encodedHeader,
        encodedPayload,
        signingInput: `${encodedHeader}.${encodedPayload}`,
        iat: finalPayload.iat,
        exp: finalPayload.exp
    };
}
