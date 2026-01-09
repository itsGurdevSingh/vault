
export class Signer {
    /**
     * opts:
     *  - defaultTTL (seconds)
     *  - maxPayloadBytes
     *  - logger: { info, warn, error, debug } (optional)
     */
    constructor(cache, keyResolver, cryptoEngine, opts = {}) {
        this.cache = cache; // kid -> CryptoKey (no need domain our kid is globally unique)
        this.keyResolver = keyResolver;
        this.cryptoEngine = cryptoEngine;
        this.defaultTTL = typeof opts.defaultTTL === 'number' ? opts.defaultTTL : 30 * 24 * 60 * 60; // 30 days
        this.maxPayloadBytes = typeof opts.maxPayloadBytes === 'number' ? opts.maxPayloadBytes : 4 * 1024;
        this.logger = opts.logger || console;
    }

    _validateInput(domain, payload) {
        // validate inputs
        if (!domain || typeof domain !== 'string') throw new error('domain required string');
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new error('payload must be plain object');
    }

    _validateTTL(ttlSeconds) {
        if (typeof ttlSeconds !== 'number' || ttlSeconds <= 0) {
            throw new error('ttlSeconds must be a positive number');
        }
    }

    async _getActiveKid(domain) {
        const activeKid = await this.keyResolver.getActiveKID(domain);
        if (!activeKid) {
            throw new error(`No active signing KID for domain "${domain}"`);
        }
        return activeKid;
    }

    async _getCryptoKeyForKid(kid) {
        // Check cache first
        let cryptoKey = this.cache.get(kid);

        // Cache miss - load from KeyResolver
        if (!cryptoKey) {
            try {
                const { privateKey } = await this.keyResolver.getSigningKey(domain);
                cryptoKey = await this._convertToCryptoKey(privateKey);
            } catch (err) {
                this.logger.error(`Signer: failed to import key for domain ${domain}`, err);
                throw new error('Failed to import private key');
            }
            // replace cache
            this.cache.set(activeKid, cryptoKey);
            // optionally log cache swap
            this.logger.debug?.(`Signer: cached cryptoKey for domain=${domain}, kid=${activeKid}`);
        }
        return cryptoKey;
    }


    /**
     * Primary sign API.
     * payload must be plain object.
     * options:
     *   - ttlSeconds (overrides default ttl)
     *   - additionalClaims (object)
     */
    async sign(domain, payload, options = {}) {

    this._validateInput(domain, payload);

    // validate MAX_TTL
    if (options.ttlSeconds !== undefined) {
        this._validateTTL(options.ttlSeconds);  
    } else {
        options.ttlSeconds = this.defaultTTL;
    }

    // ... validation ...
    const activeKid = await this._getActiveKid(domain);

    // 2. BUILD (Infra Responsibility)
    // The engine handles the byte math, json stringify, and encoding.
    const parts = this.cryptoEngine.buildTokenParts(payload, activeKid, {
        ttlSeconds: options.ttlSeconds,
        additionalClaims: options.additionalClaims
    });

    // 3. SIGN (Infra Responsibility)
    const cryptoKey = await this._getCryptoKeyForKid(activeKid);
    const signature = await this.cryptoEngine.sign(cryptoKey, parts.signingInput);

    return `${parts.encodedHeader}.${parts.encodedPayload}.${signature}`;
}

    async _convertToCryptoKey(pem) {
       return await this.cryptoEngine.importPrivateKey(pem)
    }
}
