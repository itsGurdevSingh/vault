import { keyManager } from './keyManager.js';
const _INSTANCE_TOKEN = Symbol('keyJanitor.instance');

class keyJanitor {

    constructor(token) {
        if (token !== _INSTANCE_TOKEN) {
            throw new Error('Use KeyJanitor.getInstance() instead.');
        }

        keyManager.grantAccess(this);

        const resolvers =  keyManager._getResolvers(this); // ensure resolvers are initialized

        this.resolveLoader = resolvers.loader;
        this.resolveBuilder = resolvers.builder;
        this.resolveGenerator = resolvers.generator;

    }


    static getInstance() {
        if (!this._instance) {
            this._instance = new keyJanitor(_INSTANCE_TOKEN);
        }
        return this._instance;
    }

    /* Delete private key file */
    async deletePrivateKey(domain, kid) {
        const loader = await this.resolveLoader(domain);
        await loader.deletePrivateKey(kid);
    }

    /** Delete Public key file */
    async deletePublicKey(domain, kid) {
        const loader = await this.resolveLoader(domain);
        await loader.deletePublicKey(kid);

        // also remove from cache in JWKSBuilder(jwks are only build for public keys )
        const builder = await this.resolveBuilder(domain);
        builder.clearKeyFromCache(kid);
    }


}