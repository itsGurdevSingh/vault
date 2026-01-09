import { Signer } from "./Signer.js";

class SignerFactory {
    constructor(cache, keyResolver, cryptoEngine, opts = { logger: console }) {
        this.cache = cache;
        this.keyResolver = keyResolver;
        this.cryptoEngine = cryptoEngine;
        this.opts = opts;
    }
    create() {
        return new Signer(
            this.cache,
            this.keyResolver,
            this.cryptoEngine,
            this.opts
        );
    }
    static getInstance(cache, keyResolver, cryptoEngine, opts = {}) {
        if (!this._instance) {
            this._instance = new SignerFactory(cache, keyResolver, cryptoEngine, opts);
        }
        return this._instance;
    }
}

export { SignerFactory };