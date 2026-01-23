import { DirManager } from "./DirManager.js";
import { KeyWriter } from "./KeyWriter.js";
import { RSAKeyGenerator } from "./RSAKeyGenerator.js";
import { mkdir, writeFile } from "fs/promises";

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
