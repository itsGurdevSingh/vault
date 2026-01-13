import { KeyReader } from "./KeyReader.js";
import { KeyDirectory } from "./KeyDirectory.js";
import { KeyRegistry } from "./KeyRegistry.js";


class LoaderFactory {

    constructor({ loaderCache, pathService, cryptoEngine }) {
        this.KeyCache = loaderCache;
        this.pathService = pathService;
        this.cryptoEngine = cryptoEngine;
    }

    async create() {
        // injections
        const reader = new KeyReader(this.KeyCache, this.pathService, this.cryptoEngine);
        const directory = new KeyDirectory(this.pathService);

        // return new KeyRegistry instance
        return new KeyRegistry({ reader, directory });
    }

    static getInstance({ loaderCache, pathService, cryptoEngine }) {
        if (!this._instance) {
            this._instance = new LoaderFactory({ loaderCache, pathService, cryptoEngine });
        }
        return this._instance;
    };

}

export { LoaderFactory };