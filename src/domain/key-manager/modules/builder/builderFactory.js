import { Builder } from "./JWKSBuilder";

class BuilderFactory {
    static getInstance(cache, loader, cryptoEngine) {
        if (!this._instance) {
            this._instance = new BuilderFactory(cache, loader, cryptoEngine);
        }
        return this._instance;
    }

    constructor(cache, loader, cryptoEngine) {
        this.cache = cache;
        this.loader = loader;
        this.cryptoEngine = cryptoEngine;
    }

    create() {
        return new Builder(this.cache, this.loader, this.cryptoEngine);
    }
}
export { BuilderFactory };