import { RSAKeyGenerator } from "./RSAKeyGenerator.js";

export class GeneratorFactory {

    constructor({ cryptoEngine, metadataManager, keyStore }) {
        this.cryptoEngine = cryptoEngine;
        this.metadataManager = metadataManager;
        this.keyStore = keyStore;
    }

    create() {
        return new RSAKeyGenerator(this.cryptoEngine, this.metadataManager, this.keyStore);
    }

    static getInstance({ cryptoEngine, metadataManager, keyStore }) {
        if (!this.instance) {
            this.instance = new GeneratorFactory({ cryptoEngine, metadataManager, keyStore });
        }
        return this.instance;
    }
}
