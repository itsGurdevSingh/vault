import { KeyReader } from "./KeyReader.js";
import { KeyDirectory } from "./KeyDirectory.js";
import { KeyRegistry } from "./KeyRegistry.js";


class LoaderFactory {

    constructor(chache, pathService, cryptoEngine) {
        this.KeyChache = chache;
        this.pathService = pathService;
        this.cryptoEngine = cryptoEngine;
    }

    async create() {
        // injections
        const reader = new KeyReader(this.KeyChache, this.pathService, this.cryptoEngine);
        const directory = new KeyDirectory(this.pathService);

        // return new KeyRegistry instance
        return new KeyRegistry({ reader, directory });
    }

    static getInstance(chache, pathService, cryptoEngine) {
        if (!this._instance) {
            this._instance = new LoaderFactory(chache, pathService, cryptoEngine);
        }
        return this._instance;
    };

}

export { LoaderFactory };