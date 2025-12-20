import { normalizeDomain } from "../utils/normalizer.js";
import { resolvers } from "../loader/resolvers.js";
import { Cache } from "../../utils/cache.js";

class ActiveKidStore {

    constructor() {
        this.map = new Cache(); // for now in-memory
        this.resolver = resolvers.create();
    }

    async setActiveKid(domain, kid) {
        const d = normalizeDomain(domain);
        
        const privateKids = await loader.getAllPrivateKids();

        if (!privateKids.includes(kid)) {
            throw new Error(`Cannot set active kid "${kid}" — private key missing.`);
        }

        this.map.set(d, kid);
        return kid;
    }

    getActiveKid(domain) {
        return this.map.get(normalizeDomain(domain)) ?? null;
    }

    clearActiveKid(domain) {
        this.map.delete(normalizeDomain(domain));
    }

    clearAll() {
        this.map.clear();
    }

    /** Bridge to loader: return signing key */
    async getSigningKey(domain) {
        const d = normalizeDomain(domain);
        const activeKid = this.getActiveKid(d);

        if (!activeKid) {
            throw new Error(`Active KID not set for domain: ${d}`);
        }

        const loader = await this.resolver.resolveLoader(d);
        const privateKey = await loader.loadPrivateKey(activeKid);

        return { kid: activeKid, privateKey };
    }
}

export const activeKidStore = new ActiveKidStore();
