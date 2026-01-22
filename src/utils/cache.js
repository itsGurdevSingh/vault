class Cache {
    constructor({ limit = 1000 }) {
        this._cache = new Map();
        this.limit = limit;
    }

    clear() {
        this._cache.clear();
    }

    get cache() {
        return this._cache;
    }

    set cache(value) {
        this._cache = value;

    }

    has(key) {
        return this._cache.has(key);
    }

    get(key) {
        return this._cache.get(key);
    }

    set(key, value) {
        if (this._cache.size >= this.limit && !this._cache.has(key)) {
            // Evict the oldest entry (FIFO)
            const oldestKey = this._cache.keys().next().value;
            this._cache.delete(oldestKey);
        }
        this._cache.set(key, value);
    }

    delete(key) {
        this._cache.delete(key);
    }
}

export { Cache };

