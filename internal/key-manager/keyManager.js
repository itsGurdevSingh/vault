import { KeyLoader } from './keyLoader.js';
import { JWKSBuilder } from '../../src/core/rsa/jwks-builder.js';
import { KeyPairGenerator } from '../../src/core/rsa/generator.js';

const _INSTANCE_TOKEN = Symbol('KeyManager.instance');

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

    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new KeyManager(_INSTANCE_TOKEN);
        }
        return this._instance;
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

    // Rotation placeholder (to be implemented in next task)
    async rotateKeys(domain) {
        throw new Error("rotateKeys() not implemented yet.");
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
