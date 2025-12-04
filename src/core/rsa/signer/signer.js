import { keyManager } from '../../internal/key-manager/keyManager.js';
import { pemToArrayBuffer, base64UrlEncode } from './crypto-utils.js';
import { buildJWTParts } from './jwt.js';
import { SignerCache } from './cache.js';
import { MissingKeyError, CryptoImportError, SigningFailedError, ValidationError } from './errors.js';

export class Signer {
    /**
     * opts:
     *  - cache: instance of SignerCache (optional)
     *  - defaultTTL (seconds)
     *  - maxPayloadBytes
     *  - logger: { info, warn, error, debug } (optional)
     */
    constructor(opts = {}) {
        this.cache = opts.cache || new SignerCache();
        this.defaultTTL = typeof opts.defaultTTL === 'number' ? opts.defaultTTL : 300; // 5 min
        this.maxPayloadBytes = typeof opts.maxPayloadBytes === 'number' ? opts.maxPayloadBytes : 4 * 1024;
        this.logger = opts.logger || console;
    }

    /**
     * Primary sign API.
     * payload must be plain object.
     * options:
     *   - ttlSeconds (overrides default ttl)
     *   - additionalClaims (object)
     */
    async sign(domain, payload = {}, options = {}) {
        if (!domain || typeof domain !== 'string') throw new ValidationError('domain required string');
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ValidationError('payload must be plain object');

        // 1. fetch active signing key (kid + privateKey) from keyManager (single source of truth)
        const signingKey = await keyManager.getSigningKey(domain);
        if (!signingKey || !signingKey.privateKey || !signingKey.kid) {
            throw new MissingKeyError(`No active signing key for domain "${domain}"`);
        }

        const { privateKey, kid } = signingKey;

        // 2. Prepare JWT parts (header + payload)
        const jwtParts = buildJWTParts(payload, kid, {
            ttlSeconds: options.ttlSeconds ?? this.defaultTTL,
            additionalClaims: options.additionalClaims ?? {},
            maxPayloadBytes: options.maxPayloadBytes ?? this.maxPayloadBytes
        });

        // 3. Get or create CryptoKey from cache (per-domain)
        let cacheEntry = this.cache.get(domain);
        let cryptoKey = null;

        if (cacheEntry && cacheEntry.kid === kid && cacheEntry.cryptoKey) {
            cryptoKey = cacheEntry.cryptoKey;
        } else {
            // Cache miss or rotated key — import new key and replace cache
            try {
                cryptoKey = await this._importPrivateKey(privateKey);
            } catch (err) {
                this.logger.error(`Signer: failed to import key for domain ${domain}`, err);
                throw new CryptoImportError('Failed to import private key');
            }

            // replace cache
            this.cache.set(domain, { kid, cryptoKey });
            // optionally log cache swap
            this.logger.debug?.(`Signer: cached cryptoKey for domain=${domain}, kid=${kid}`);
        }

        // 4. Sign
        try {
            const encoder = new TextEncoder();
            const sigBuffer = await crypto.subtle.sign(
                'RSASSA-PKCS1-v1_5',
                cryptoKey,
                encoder.encode(jwtParts.signingInput)
            );

            const signature = base64UrlEncode(new Uint8Array(sigBuffer));
            const token = `${jwtParts.encodedHeader}.${jwtParts.encodedPayload}.${signature}`;

            // minimal logging, never log token or privateKey
            this.logger.info?.(`Signer: issued token for domain=${domain}, kid=${kid}`);

            return token;
        } catch (err) {
            this.logger.error(`Signer: signing failed for domain ${domain}`, err);
            throw new SigningFailedError('Signing operation failed');
        }
    }

    async _importPrivateKey(pem) {
        try {
            return await crypto.subtle.importKey(
                'pkcs8',
                pemToArrayBuffer(pem),
                { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
                false,
                ['sign']
            );
        } catch (err) {
            throw err;
        }
    }

    clearCache(domain = null) {
        if (domain) {
            this.cache.delete(domain);
            this.logger.info?.(`Signer: cache cleared for domain=${domain}`);
        } else {
            this.cache.clear();
            this.logger.info?.('Signer: cache cleared (all domains)');
        }
    }
}
