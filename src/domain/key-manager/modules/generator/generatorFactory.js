import { DirManager } from "./DirManager.js";
import { KeyWriter } from "./KeyWriter.js";
import { KeyPairGenerator } from "./RSAKeyGenerator.js";
import { mkdir, writeFile } from "fs/promises";

export class GeneratorFactory {

    constructor(cryptoEngine, metadataManager, paths) {
        this.cryptoEngine = cryptoEngine;
        this.metadataManager = metadataManager;
        this.paths = paths;
    }

    create() {
        const keyWriter = new KeyWriter(this.paths, writeFile);
        const dirManager = new DirManager(this.paths, mkdir);
        return new KeyPairGenerator(this.cryptoEngine, this.metadataManager, keyWriter, dirManager);
    }

    static getInstance(cryptoEngine, metadataManager, paths) {
        if (!this.instance) {
            this.instance = new GeneratorFactory(cryptoEngine, metadataManager, paths);
        }
        return this.instance;
    }
}
