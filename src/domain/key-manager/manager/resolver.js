import { KeyLoader } from "../KeyLoader";
import { Cache } from "../utils/cache";
import { normalizeDomain } from "../utils/normalizer";

const _INSTANCE_TOKEN = Symbol('resolver.instance');


// initalize caches
const Loaders = new Cache();
const Builders = new Cache();
const Generators = new Cache();

export class Resolvers {

    constructor(token) {
        if (token !== _INSTANCE_TOKEN) {
            throw new Error('Use resolvers.create() instead.');
        }
    }
    
    static create() {
        if (!this._instance) {
            this._instance = new resolvers(_INSTANCE_TOKEN);
        }
        return this._instance;
    }


    async resolveLoader(domain) {
        const d = normalizeDomain(domain);

        if (Loaders.get(d)) {
            return Loaders.get(d);
        }
        const loader = await KeyLoader.create(d);
        Loaders.set(d, loader);
        return loader;
    }

    async resolveBuilder(domain) {
        const d = normalizeDomain(domain);
        if (Builders.get(d)) {
            return Builders.get(d);
        }
        const builder = new JWKSBuilder(d);
        Builders.set(d, builder);
        return builder;
    }

    async resolveGenerator(domain) {
        const d = normalizeDomain(domain);
        if (Generators.get(d)) {
            return Generators.get(d);
        }
        const generator = await KeyPairGenerator.create(d);
        Generators.set(d, generator);
        return generator;
    }

}