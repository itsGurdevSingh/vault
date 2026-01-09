import { KeyReader } from "./KeyReader.js";
import { KeyDirectory } from "./KeyDirectory.js";
import { KeyRegistry } from "./KeyRegistry.js";


class LoaderFactory {

    constructor(chache, pathsRepo, cryptoEngine) {
        this.KeyChache = chache;
        this.pathsRepo = pathsRepo;
        this.cryptoEngine = cryptoEngine;
    }

    async create() {
        // injections
        const reader = new KeyReader(this.KeyChache, this.pathsRepo, this.cryptoEngine);
        const directory = new KeyDirectory(this.pathsRepo);

        // return new KeyRegistry instance
        return new KeyRegistry({ reader, directory });
    }

    static getInstance(chache, pathsRepo, cryptoEngine) {
        if (!this._instance) {
            this._instance = new LoaderFactory(chache, pathsRepo, cryptoEngine);
        }
        return this._instance;
    };

}

export { LoaderFactory };