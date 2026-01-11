export class Builder {
    constructor(Cache, loader, cryptoEngine) {
        this.cache = Cache;
        this.loader = loader;
        this.cryptoEngine = cryptoEngine;
    }

    async #toJWK(kid, pem) {
        const cached = this.cache.get(kid);
        if (cached) return cached;

        const jwk = await this.cryptoEngine.pemToJWK(pem, kid);
        this.cache.set(kid, jwk);
        return jwk;
    }

    async getJWKS(domain) {
        const publicKeys = await this.loader.getPubKeyMap(domain); // kid -> pem

        const keys = [];
        for (const [kid, pem] of Object.entries(publicKeys)) {
            keys.push(await this.#toJWK(kid, pem));
        }
        return { keys };
    }

    // Alias for KeyManager facade compatibility
    async getJwks(domain) {
        return await this.getJWKS(domain);
    }
}
