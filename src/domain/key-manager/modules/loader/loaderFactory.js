import { KeyReader } from "./KeyReader.js";
import { Loader } from "./loader.js";


class LoaderFactory {

    constructor({ loaderCache, keyStore, cryptoEngine }) {
        this.KeyCache = loaderCache;
        this.keyStore = keyStore;
        this.cryptoEngine = cryptoEngine;
    }

    async create() {
        // injections
        const reader = new KeyReader(this.KeyCache, this.keyStore, this.cryptoEngine);

        // return new KeyRegistry instance
        return new Loader({ reader, keyStore: this.keyStore });
    }

    static getInstance({ loaderCache, keyStore, cryptoEngine }) {
        if (!this._instance) {
            this._instance = new LoaderFactory({ loaderCache, keyStore, cryptoEngine });
        }
        return this._instance;
    };

}

export { LoaderFactory };