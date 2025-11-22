import { KeyLoader } from './keyLoader.js';

const _INSTANCE_TOKEN = Symbol('KeyManager.instance');

class KeyManager {
    constructor(token) {
        if (token !== _INSTANCE_TOKEN) {
            throw new Error('Use KeyManager.getInstance() instead.');
        }

        this.loaders = new Map(); // domain -> KeyLoader
    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new KeyManager(_INSTANCE_TOKEN);
        }
        return this._instance;
    }

    _normalizeDomain(domain) {
        if (!domain) throw new Error("Domain is required.");
        return domain.toLowerCase().trim();
    }

    // PRIVATE: get or create loader
    async #resolveLoader(domain) {
        const d = this._normalizeDomain(domain);

        if (this.loaders.has(d)) {
            return this.loaders.get(d);
        }

        const loader = await KeyLoader.create(d);
        this.loaders.set(d, loader);

        return loader;
    }

    // High-level API ----

    async getJWKS(domain) {
        const loader = await this.#resolveLoader(domain);
        return loader.getJWKS();
    }

    async getSigningKey(domain) {
        const loader = await this.#resolveLoader(domain);
        return loader.getSigningKey();
    }

    async setActiveKid(domain, kid) {
        const loader = await this.#resolveLoader(domain);

        // check is kid exists
        const kids = await loader.getAllKids();
        if (!kids.includes(kid)) {
            throw new Error(`KID '${kid}' does not exist for domain '${domain}'.`);
        }

        loader.setActiveKid(kid);
    }

    async getActiveKid(domain) {
        const loader = await this.#resolveLoader(domain);
        return loader.activeKid;
    }

    // Rotation placeholder (to be implemented in next task)
    async rotateKeys(domain) {
        throw new Error("rotateKeys() not implemented yet.");
    }
}

export const keyManager = KeyManager.getInstance();
