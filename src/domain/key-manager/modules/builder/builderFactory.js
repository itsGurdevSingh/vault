import { JwksBuilder } from "./jwksBuilder.js";

class BuilderFactory {
    static getInstance({ cache, jwksStore, loader, cryptoEngine }) {
        if (!this._instance) {
            this._instance = new BuilderFactory({ cache, jwksStore, loader, cryptoEngine });
        }
        return this._instance;
    }

    constructor({ cache, jwksStore, loader, cryptoEngine }) {
        this.cache = cache;
        this.jwksStore = jwksStore;
        this.loader = loader;
        this.cryptoEngine = cryptoEngine;
    }

    create() {
        return new JwksBuilder(this.cache, this.jwksStore, this.loader, this.cryptoEngine);
    }
}
export { BuilderFactory };