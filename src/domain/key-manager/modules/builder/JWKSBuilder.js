export class JwksBuilder {
    constructor(Cache, jwksStore, loader, cryptoEngine) {
        this.cache = Cache;
        this.jwksStore = jwksStore;
        this.loader = loader;
        this.cryptoEngine = cryptoEngine;
    }

    async #toJWK(kid, pem) {
        const cached = this.cache.get(kid);
        if (cached) return cached;

        // check jwks store
        const stored = await this.jwksStore.find(kid);
        if (stored) {
            this.cache.set(kid, stored);
            return stored;
        }

        const jwk = await this.cryptoEngine.pemToJWK(pem, kid);
        this.cache.set(kid, jwk);
        await this.jwksStore.create(jwk);
        return jwk;
    }

    async getJWKS(domain) {
        const publicKeys = await this.loader.getPublicKeyMap(domain); // kid -> pem

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
