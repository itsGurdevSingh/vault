class Cache {
    constructor() {
        this._cache = new Map(); // key -> cached value
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
        this._cache.set(key, value);
    }

    delete(key) {
        this._cache.delete(key);
    }
}

export { Cache };

