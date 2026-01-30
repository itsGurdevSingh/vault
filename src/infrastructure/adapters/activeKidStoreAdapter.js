import { ActiveKidStorePort } from "../../application/ports/activeKidStorePort";

export class ActiveKidStoreAdapter extends ActiveKidStorePort {
    constructor({ cache }) {
        super();
        this.cache = cache;
    }
    async get(domain) {
        return this.cache.get(domain);
    }
    async set(domain, kid) {
        return this.cache.set(domain, kid);
    }
    async delete(domain) {
        return this.cache.delete(domain);
    }
}