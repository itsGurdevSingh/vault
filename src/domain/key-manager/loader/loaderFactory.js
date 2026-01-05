import KeyCache from '../../../utils/KeyCache.js';
import KeyReader from "./KeyReader.js";
import KeyDirectory from "./KeyDirectory.js";


class LoaderFactory {

    constructor(chache, pathsRepo ) {
        this.KeyChache = chache;
        this.pathsRepo = pathsRepo;
    }

    async create() {
        // injections
        const reader = new KeyReader(this.KeyChache, this.pathsRepo);
        const directory = new KeyDirectory(this.pathsRepo);

        // return new KeyRegistry instance
        return new KeyRegistry({ reader, directory });
    }

    static getInstance( chache, pathsRepo ) {
        if (!this._instance) {
            this._instance = new LoaderFactory(chache, pathsRepo );
        }
        return this._instance;
    };

}

export { LoaderFactory };