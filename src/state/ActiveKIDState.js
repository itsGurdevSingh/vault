import { Cache } from "../../utils/cache.js";

class ActiveKidStore {
    constructor() {
        this.activeKID = new Cache(); // for now in-memory

    }

    async setActiveKid(domain, kid) {
        await this.activeKID.set(domain, kid);
        return kid;
    }

    async getActiveKid(domain) {
        return this.activeKID.get(domain);
    }

    clearActiveKid(domain) {
        this.activeKID.delete(normalizeDomain(domain));
    }

    clearAll() {
        this.activeKID.clear();
    }
}

export const activeKidStore = new ActiveKidStore();
