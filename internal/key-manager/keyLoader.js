import { join } from 'path';
import { readFile, readdir, mkdir } from 'fs/promises';
import { importSPKI, exportJWK } from 'jose';

const BASE_KEYS_DIR = join(process.cwd(), 'internal/keys');

export default class KeyLoader {
    constructor(domain) {
        if (!domain) throw new Error("KeyLoader requires a domain.");

        this.domain = domain;

        // Folder isolation per domain
        this.domainDir = join(BASE_KEYS_DIR, domain);
        this.privateDir = join(this.domainDir, 'private');
        this.publicDir = join(this.domainDir, 'public');

        // Must be set externally
        this.activeKid = null;

        // Caches
        this.cache = {
            private: new Map(),   // kid → string (pem)
            public: new Map(),    // kid → string (pem)
            jwk: new Map()        // kid → JWK object
        };

        this._ensureDirectories();
    }

    async _ensureDirectories() {
        await mkdir(this.privateDir, { recursive: true });
        await mkdir(this.publicDir, { recursive: true });
    }

    /** set active key ID */
    setActiveKid(kid) {
        if (!kid) throw new Error("Kid cannot be empty.");
        this.activeKid = kid;
    }

    /** PRIVATE KEY LOADING */
    async loadPrivateKey(kid) {
        if (this.cache.private.has(kid)) {
            return this.cache.private.get(kid);
        }

        const file = join(this.privateDir, `${kid}.pem`);
        const key = await readFile(file, 'utf8');

        this.cache.private.set(kid, key);
        return key;
    }

    /** PUBLIC KEY LOADING */
    async loadPublicKey(kid) {
        if (this.cache.public.has(kid)) {
            return this.cache.public.get(kid);
        }

        const file = join(this.publicDir, `${kid}.pem`);
        const key = await readFile(file, 'utf8');

        this.cache.public.set(kid, key);
        return key;
    }

    /** LOAD ALL KIDs FROM PUBLIC FOLDER */
    async getAllKids() {
        const files = await readdir(this.publicDir);
        return files
            .filter(f => f.endsWith('.pem'))
            .map(f => f.replace('.pem', '')); // kid = filename
    }

    /** GET CURRENT SIGNING KEY */
    async getSigningKey() {
        if (!this.activeKid) {
            throw new Error("Active kid is not set.");
        }

        const privateKeyPem = await this.loadPrivateKey(this.activeKid);

        return {
            kid: this.activeKid,
            privateKey: privateKeyPem
        };
    }

    /** JWK BUILDER (PUBLIC ONLY) */
    async _getPublicJWK(kid) {
        if (this.cache.jwk.has(kid)) {
            return this.cache.jwk.get(kid);
        }

        const publicKeyPem = await this.loadPublicKey(kid);
        const keyObj = await importSPKI(publicKeyPem, 'RS256');
        const jwk = await exportJWK(keyObj);

        // Add required fields
        jwk.kid = kid;
        jwk.use = 'sig';
        jwk.alg = 'RS256';

        this.cache.jwk.set(kid, jwk);
        return jwk;
    }

    /** GENERATE JWKS FOR THIS DOMAIN */
    async getJWKS() {
        const kids = await this.getAllKids();
        const keys = [];

        for (const kid of kids) {
            const jwk = await this._getPublicJWK(kid);
            keys.push(jwk);
        }

        return { keys };
    }
}
