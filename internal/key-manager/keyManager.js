import { KeyLoader } from './keyLoader.js';
import { JWKSBuilder } from '../../src/core/rsa/jwks-builder.js';
import { KeyPairGenerator } from '../../src/core/rsa/generator.js';
import { keyJanitor } from './KeyJanitor.js';

const _INSTANCE_TOKEN = Symbol('KeyManager.instance');
const _internal = new WeakMap();

class KeyManager {
    constructor(token) {
        if (token !== _INSTANCE_TOKEN) {
            throw new Error('Use KeyManager.getInstance() instead.');
        }

        this.cache = {
            generator: new Map(), // domain -> KeyPairGenerator
            loaders: new Map(), // domain -> KeyLoader
            builders: new Map() // domain -> JWKSBuilder
        }

        this.locks = new Map();

        keyJanitor.init(this);

    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new KeyManager(_INSTANCE_TOKEN);
        }
        return this._instance;
    }

    grantAccess(friend) {
        _internal.set(friend, {
            loader: this.#resolveLoader.bind(this),
            builder: this.#resolveBuilder.bind(this),
            generator: this.#resolveGenerator.bind(this),
        });
    }

    _getResolvers(friend) {
        const resolvers = _internal.get(friend);
        if (!resolvers) throw new Error("Unauthorized");
        return resolvers;
    }

    _normalizeDomain(domain) {
        if (!domain) throw new Error("Domain is required.");
        return domain.toUpperCase().trim();
    }

    // PRIVATE: get or create loader
    async #resolveLoader(domain) {
        const d = this._normalizeDomain(domain);

        if (this.cache.loaders.has(d)) {
            return this.cache.loaders.get(d);
        }

        const loader = await KeyLoader.create(d);
        this.cache.loaders.set(d, loader);

        return loader;
    }

    async #resolveBuilder(domain) {
        const d = this._normalizeDomain(domain);

        if (this.cache.builders.has(d)) {
            return this.cache.builders.get(d);
        }

        const builder = new JWKSBuilder(d);
        this.cache.builders.set(d, builder);
        return builder;
    }

    async #resolveGenerator(domain) {
        const d = this._normalizeDomain(domain);

        if (this.cache.generator.has(d)) {
            return this.cache.generator.get(d);
        }
        const generator = await KeyPairGenerator.create(d);
        this.cache.generator.set(d, generator);
        return generator;
    }

    // High-level API ----

    async generateKeyPair(domain) {
        const generator = await this.#resolveGenerator(domain);
        return await generator.generateRSAKeyPair();
    }

    async getJwks(domain) {
        const builder = await this.#resolveBuilder(domain);
        return await builder.getJwks();
    }

    async getPublicKeys(domain) {
        const loader = await this.#resolveLoader(domain);
        return await loader.getPublicKeyMap();
    }

    async getSigningKey(domain) {
        const loader = await this.#resolveLoader(domain);
        return await loader.getSigningKey();
    }

    async setActiveKid(domain, kid) {
        const loader = await this.#resolveLoader(domain);
        await loader.setActiveKid(kid);
    }

    async getActiveKid(domain) {
        const loader = await this.#resolveLoader(domain);
        return loader.activeKid;
    }

    async rotateKeys(domain) {
        // Queue-based locking mechanism (FIFO)
        // 1. Get the last task in the queue for this domain
        const previousTask = this.locks.get(domain) || Promise.resolve();

        // 2. Chain our rotation task to run AFTER the previous one finishes
        const currentTask = previousTask.then(() => this.#performRotation(domain));

        // 3. Update the queue tail. 
        // We use .catch() to ensure the chain continues even if this task fails.
        this.locks.set(domain, currentTask.catch(() => { }));

        // 4. Return the task so the caller can await the result/error
        return currentTask;
    }

    async #performRotation(domain) {
        try {
            // generate a new key pair
            const newKid = await this.generateKeyPair(domain);

            // get old active kid
            const oldKid = await this.getActiveKid(domain);

            // set the new key as active
            await this.setActiveKid(domain, newKid);

            // delete old private key 
            if (oldKid) {
                await keyJanitor.retirePrivateKey(domain, oldKid);
            }

            return newKid;

        } catch (err) {
            console.error(`Error rotating keys for domain: ${domain}`, err);
            throw err;
        }
    }

    clearCache() {

        // clear individual caches first
        for (const loader of this.cache.loaders.values()) {
            loader.clearCache();
        }
        for (const builder of this.cache.builders.values()) {
            builder.clearCache();
        }

        // clear main caches
        this.cache.generator.clear();
        this.cache.loaders.clear();
        this.cache.builders.clear();


    }
}

export const keyManager = KeyManager.getInstance();
