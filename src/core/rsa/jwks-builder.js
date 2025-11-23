import { importSPKI, exportJWK } from 'jose';
import { keyManager } from '../../../internal/key-manager/keyManager.js';

export class JWKSBuilder {
    constructor(domain) {
        this.domain = domain;
        this.jwkCache = new Map(); // kid -> jwk
    }

    async _pemToJWK(kid, pem) {
        if (this.jwkCache.has(kid)) {
            return this.jwkCache.get(kid);
        }

        const keyObj = await importSPKI(pem, 'RS256');
        const jwk = await exportJWK(keyObj);

        jwk.kid = kid;
        jwk.use = 'sig';
        jwk.alg = 'RS256';

        this.jwkCache.set(kid, jwk);
        return jwk;
    }

    async getJwks() {
        const publicKeys = await keyManager.getPublicKeys(this.domain);

        const jwks = {
            keys: []
        };

        for (const [kid, pem] of publicKeys.entries()) {
            const jwk = await this._pemToJWK(kid, pem);
            jwks.keys.push(jwk);
        }

        return jwks;
    }

    clearCache() {
        this.jwkCache.clear();
    }

    clearKeyFromCache(kid) {
        this.jwkCache.delete(kid);
    }
}
