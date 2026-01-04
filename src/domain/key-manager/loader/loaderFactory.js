import KeyCache from './KeyCache.js';
import KeyReader from "./KeyReader.js";
import KeyDirectory from "./KeyDirectory.js";


class LoaderFactory {

    static #instances = new Map(); // domain -> KeyRegistry instance

    constructor(chache,pathsRepo,normalizer) {
        this.Chache = chache;
        this.pathsRepo = pathsRepo;
        this.normalizer = normalizer;
    }

    async createRegistry(domain) {

        // injections
        const keyCache = new KeyCache(this.Cache);
        const reader = new KeyReader(domain, keyCache, this.pathsRepo);
        const directory = new KeyDirectory(domain, this.pathsRepo);

        // return new KeyRegistry instance
        return new KeyRegistry({ reader, directory });

    }

    static create(domain) {
        if (!domain) throw new Error("Domain required");
        const d = this.normalizer(domain);

        if (!this.#instances.has(d)) {
            this.#instances.set(d, createRegistry(d));
        }
        return this.#instances.get(d);
    };

}

export { LoaderFactory };