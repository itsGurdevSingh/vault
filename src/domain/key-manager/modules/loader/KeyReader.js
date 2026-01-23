export class KeyReader {
    constructor(cache, keyStore, cryptoEngine) {
        this.cache = cache;
        this.keyStore = keyStore;
        this.cryptoEngine = cryptoEngine;
    }

    async privateKey(kid) {

        let pem = this.cache.private.get(kid);
        if (!pem) {
            const domain = this.cryptoEngine.getInfo(kid).domain;
            pem = await this.keyStore.loadPrivateKey(domain, kid);
            this.cache.private.set(kid, pem);
        }
        return pem;
    }

    async publicKey(kid) {
        let pem = this.cache.public.get(kid);
        if (!pem) {
            const domain = this.cryptoEngine.getInfo(kid).domain;
            pem = await this.keyStore.loadPublicKey(domain, kid);
            this.cache.public.set(kid, pem);
        }
        return pem;
    }
}
