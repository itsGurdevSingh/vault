import { join } from 'path';
import { readFile, readdir, mkdir } from 'fs/promises';
import { KeyPaths } from './keyPaths';

export class KeyLoader {
    constructor(domain) {
        if (!domain) throw new Error("KeyLoader requires a domain.");

        this.domain = domain;

        this.activeKid = null;

        this.cache = {
            private: new Map(),  // kid → pem
            public: new Map(),   // kid → pem
        };
    }

    static async create(domain) {
        const loader = new KeyLoader(domain);
        await loader._ensureDirectories();
        return loader;
    }

    async _ensureDirectories() {
        await mkdir(KeyPaths.privateDir(this.domain), { recursive: true });
        await mkdir(KeyPaths.publicDir(this.domain), { recursive: true });
    }

    async setActiveKid(kid) {
        if (!kid) throw new Error("Kid cannot be empty.");

        const privateKids = await this.getAllPrivateKids();

        if (!privateKids.includes(kid)) {
            throw new Error(`Active kid '${kid}' does not exist in private keys for domain: ${this.domain}`);
        }

        this.activeKid = kid;
    }


    /** Load private key */
    async loadPrivateKey(kid) {
        if (this.cache.private.has(kid)) {
            return this.cache.private.get(kid);
        }

        const file = KeyPaths.privateKey(this.domain, kid);
        const pem = await readFile(file, 'utf8');

        this.cache.private.set(kid, pem);
        return pem;
    }

    /** Load public key */
    async loadPublicKey(kid) {
        if (this.cache.public.has(kid)) {
            return this.cache.public.get(kid);
        }

        const file = KeyPaths.publicKey(this.domain, kid);
        const pem = await readFile(file, 'utf8');

        this.cache.public.set(kid, pem);
        return pem;
    }

    /** Public KIDs only */
    async getAllPublicKids() {
        const files = await readdir(KeyPaths.publicDir(this.domain));
        return files
            .filter(f => f.endsWith('.pem'))
            .map(f => f.replace('.pem', ''));
    }

    /** Private KIDs only */
    async getAllPrivateKids() {
        const files = await readdir(KeyPaths.privateDir(this.domain));
        return files
            .filter(f => f.endsWith('.pem'))
            .map(f => f.replace('.pem', ''));
    }

    /** Current private signing key */
    async getSigningKey() {
        if (!this.activeKid) {
            throw new Error("Active kid is not set.");
        }
        const pem = await this.loadPrivateKey(this.activeKid);
        return { kid: this.activeKid, privateKey: pem };
    }

    /** Map of kid → publicKeyPem */
    async getPublicKeyMap() {
        const kids = await this.getAllPublicKids();
        const map = {};

        for (const kid of kids) {
            map[kid] = await this.loadPublicKey(kid);
        }

        return map;
    }

    /** Clear cache */
    clearCache() {
        this.cache.private.clear();
        this.cache.public.clear();
    }
}
