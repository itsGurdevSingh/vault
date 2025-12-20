import { keyManager } from "../../domain/key-manager/index.js";
import { JWKConverter } from "./JWKConverter.js";
import { Cache } from "../../../utils/cache.js";

export class JWKSBuilder {
    constructor(domain) {
        this.domain = domain;
        this.cache = new Cache();
    }

    async #toJWK(kid, pem) {
        const cached = this.cache.get(kid);
        if (cached) return cached;

        const jwk = await JWKConverter.fromPEM(pem, kid);
        this.cache.set(kid, jwk);
        return jwk;
    }

    async getJWKS() {
        const publicKeys = await keyManager.getPublicKeys(this.domain);

        const keys = [];
        for (const [kid, pem] of Object.entries(publicKeys)) {
            keys.push(await this.#toJWK(kid, pem));
        }

        return { keys };
    }

    clear() {
        this.cache.clear();
    }

    clearKey(kid) {
        this.cache.delete(kid);
    }
}
