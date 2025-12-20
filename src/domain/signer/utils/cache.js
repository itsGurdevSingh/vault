// Lightweight domain-> { kid, cryptoKey, createdAt } cache with simple API.
// we can replace this with LRU or an external cache later.

export class SignerCache {
    constructor() {
        this.map = new Map(); // domain -> { kid, cryptoKey, createdAt }
    }

    get(domain) {
        return this.map.get(domain);
    }

    set(domain, entry) {
        // entry = { kid, cryptoKey }
        this.map.set(domain, { ...entry, createdAt: Date.now() });
    }

    delete(domain) {
        this.map.delete(domain);
    }

    clear() {
        this.map.clear();
    }
}
