import { Cache } from "../utils/cache.js";

class ActiveKidStore {
    constructor() {
        this.activeKid = new Cache(); // for now in-memory

    }

    async setActiveKid(domain, kid) {
        await this.activeKid.set(domain, kid);
        return kid;
    }

    async getActiveKid(domain) {
        return this.activeKid.get(domain);
    }

    clearActiveKid(domain) {
        this.activeKid.delete(normalizeDomain(domain));
    }

    clearAll() {
        this.activeKid.clear();
    }
}

export const activeKidStore = new ActiveKidStore();
