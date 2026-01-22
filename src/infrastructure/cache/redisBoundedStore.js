class RedisBoundedStore {
    constructor({
        prefix,
        limit,
        redisClient,
        touchOnGet = false,
        cleanupThreshold = 0.8
    }) {
        RedisBoundedStore._validateConstruction(
            prefix,
            limit,
            redisClient,
            cleanupThreshold
        );

        this.prefix = prefix.endsWith(":") ? prefix : `${prefix}:`;
        this.indexKey = `${this.prefix}__index__`;
        this.limit = limit;
        this.redis = redisClient;
        this.touchOnGet = touchOnGet;
        this.cleanupThreshold = cleanupThreshold;
    }

    /* ===========================
       Validation
       =========================== */

    static _validateConstruction(prefix, limit, redisClient, cleanupThreshold) {
        // prefix
        if (typeof prefix !== "string" || prefix.trim().length === 0) {
            throw new Error("prefix must be a non-empty string");
        }

        // limit
        if (!Number.isInteger(limit) || limit <= 0) {
            throw new Error("limit must be a positive integer");
        }

        // cleanupThreshold
        if (
            typeof cleanupThreshold !== "number" ||
            Number.isNaN(cleanupThreshold) ||
            cleanupThreshold <= 0.5 ||
            cleanupThreshold > 1
        ) {
            throw new Error("cleanupThreshold must be a number in the range (0.5, 1]");
        }

        // redis client
        if (
            !redisClient ||
            typeof redisClient.get !== "function" ||
            typeof redisClient.set !== "function" ||
            typeof redisClient.del !== "function" ||
            typeof redisClient.exists !== "function" ||
            typeof redisClient.multi !== "function" ||
            typeof redisClient.llen !== "function" ||
            typeof redisClient.lrange !== "function" ||
            typeof redisClient.lpop !== "function" ||
            typeof redisClient.lrem !== "function" ||
            typeof redisClient.rpush !== "function"
        ) {
            throw new Error("redisClient must be a valid Redis client instance");
        }
    }

    /* ===========================
       Key helpers
       =========================== */

    key(k) {
        if (typeof k !== "string" || k.length === 0) {
            throw new Error("Key must be a non-empty string");
        }
        return `${this.prefix}${k}`;
    }

    /* ===========================
       Public API
       =========================== */

    async set(key, value, ttlSeconds = null) {
        const redisKey = this.key(key);

        // Fast path
        const [exists, indexSize] = await Promise.all([
            this.redis.exists(redisKey),
            this.redis.llen(this.indexKey)
        ]);

        // Self-heal index if nearing capacity
        if (indexSize > this.limit * this.cleanupThreshold) {
            await this.cleanupStaleIndex();
        }

        // Update existing key (no eviction)
        if (exists) {
            if (ttlSeconds) {
                await this.redis.set(redisKey, value, "EX", ttlSeconds);
            } else {
                await this.redis.set(redisKey, value);
            }
            return;
        }

        // Authoritative mutation
        const tx = this.redis.multi();

        tx.lrem(this.indexKey, 0, key);
        tx.rpush(this.indexKey, key);

        if (ttlSeconds) {
            tx.set(redisKey, value, "EX", ttlSeconds);
        } else {
            tx.set(redisKey, value);
        }

        tx.llen(this.indexKey);

        const res = await tx.exec();
        const size = res.at(-1)[1];

        // Evict overflow
        if (size > this.limit) {
            const overflow = size - this.limit;
            for (let i = 0; i < overflow; i++) {
                const evicted = await this.redis.lpop(this.indexKey);
                if (evicted) {
                    await this.redis.del(this.key(evicted));
                }
            }
        }
    }

    async get(key) {
        const redisKey = this.key(key);
        const value = await this.redis.get(redisKey);

        if (value === null) {
            await this.redis.lrem(this.indexKey, 0, key);
            return null;
        }

        // Optional LRU-style touch
        if (this.touchOnGet) {
            await this.redis.multi()
                .lrem(this.indexKey, 0, key)
                .rpush(this.indexKey, key)
                .exec();
        }

        return value;
    }

    async del(key) {
        await this.redis.multi()
            .lrem(this.indexKey, 0, key)
            .del(this.key(key))
            .exec();
    }

    async clear() {
        const keys = await this.redis.lrange(this.indexKey, 0, -1);
        if (keys.length) {
            const redisKeys = keys.map(k => this.key(k));
            await this.redis.del(...redisKeys);
        }
        await this.redis.del(this.indexKey);
    }

    /* ===========================
       Maintenance
       =========================== */

    async cleanupStaleIndex() {
        const keys = await this.redis.lrange(this.indexKey, 0, -1);
        if (!keys.length) return;

        const existsTx = this.redis.multi();
        for (const k of keys) {
            existsTx.exists(this.key(k));
        }

        const results = await existsTx.exec();

        const cleanupTx = this.redis.multi();
        results.forEach(([, exists], i) => {
            if (!exists) {
                cleanupTx.lrem(this.indexKey, 0, keys[i]);
            }
        });

        await cleanupTx.exec();
    }
}

export default RedisBoundedStore;
