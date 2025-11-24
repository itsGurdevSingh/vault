import { KEY_GRACE_MS, KEY_PUBLIC_TTL_MS } from '../../src/config/keys.js';
import { metadataManager } from '../metadata-manager/metadataManager.js';

const _INSTANCE_TOKEN = Symbol('keyJanitor.instance');

class KeyJanitor {

    constructor(token) {
        if (token !== _INSTANCE_TOKEN) {
            throw new Error('Use KeyJanitor.getInstance() instead.');
        }
    }

    init(keyManager) {
        keyManager.grantAccess(this);

        const resolvers = keyManager._getResolvers(this); // ensure resolvers are initialized

        this.resolveLoader = resolvers.loader;
        this.resolveBuilder = resolvers.builder;
        this.resolveGenerator = resolvers.generator;
    }


    static getInstance() {
        if (!this._instance) {
            this._instance = new KeyJanitor(_INSTANCE_TOKEN);
        }
        return this._instance;
    }

    /* Delete private key file */
    async retirePrivateKey(domain, kid) {

        try {
            // add expiration metadata
            await this.#addKeyExpiry(domain, kid);

            // delete private key file
            const loader = await this.resolveLoader(domain);
            await loader.deletePrivateKey(kid);

        } catch (err) {
            console.error(`Error retiring private key for domain: ${domain}, kid: ${kid}`, err);
            throw err;
        }
    }

    /** Delete Public key file */
    async deletePublicKey(domain, kid) {

        try {
            const loader = await this.resolveLoader(domain);
            await loader.deletePublicKey(kid);

            // also remove from cache in JWKSBuilder(jwks are only build for public keys )
            const builder = await this.resolveBuilder(domain);
            builder.clearKeyFromCache(kid);

        } catch (err) {
            console.error(`Error deleting public key for domain: ${domain}, kid: ${kid}`, err);
            throw err;
        }
    }

    /** add expiry to metadata and move meta to archive */
    async #addKeyExpiry(domain, kid) {

        const expirationDate = new Date(Date.now() + KEY_PUBLIC_TTL_MS + KEY_GRACE_MS);

        await metadataManager.addExpiry(domain, kid, expirationDate);
    }

    /**
     *  delete expired public keys 
     * this is for our corn job to call periodically
     */
    async deleteExpiredKeys() {

        // get expired metadata
        const expiredMetas = await metadataManager.getExpiredMetadata();

        if (expiredMetas.length === 0) return; // nothing to delete

        for (const meta of expiredMetas) {
            const { domain, kid } = meta;

            if (!domain || !kid) continue; // skip invalid metadata

            try {
                // delete public key
                await this.deletePublicKey(domain, kid);
                // delete archived metadata
                await metadataManager.deleteArchived(kid);

            } catch (err) {
                console.error(`Error deleting expired key for domain: ${domain}, kid: ${kid}`, err);
            }
        }
    }

}

export const keyJanitor = KeyJanitor.getInstance();