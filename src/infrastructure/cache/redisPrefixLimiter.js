// redisPrefixLimiter.js
// Abstraction for per-prefix Redis key limiting
import redis from "./redisClient.js";

class RedisPrefixLimiter {
    constructor({ prefix, limit, indexKey = null, redisClient = redis }) {
        this.prefix = prefix.endsWith(":") ? prefix : prefix + ":";
        this.limit = limit;
        this.indexKey = indexKey || `${this.prefix}index`;
        this.redis = redisClient;
    }

    async set(key, value) {
        // Remove if already exists in index
        await this.redis.lrem(this.indexKey, 0, key);
        // Add to end (most recent)
        await this.redis.rpush(this.indexKey, key);
        // Enforce limit
        const len = await this.redis.llen(this.indexKey);
        if (len > this.limit) {
            const oldest = await this.redis.lpop(this.indexKey);
            if (oldest) {
                await this.redis.del(`${this.prefix}${oldest}`);
            }
        }
        // Set value
        await this.redis.set(`${this.prefix}${key}`, value);
    }

    async get(key) {
        return this.redis.get(`${this.prefix}${key}`);
    }

    async del(key) {
        await this.redis.lrem(this.indexKey, 0, key);
        await this.redis.del(`${this.prefix}${key}`);
    }

    async clear() {
        // Remove all tracked keys
        const keys = await this.redis.lrange(this.indexKey, 0, -1);
        if (keys && keys.length) {
            const delKeys = keys.map(k => `${this.prefix}${k}`);
            await this.redis.del(...delKeys);
        }
        await this.redis.del(this.indexKey);
    }
}

export default RedisPrefixLimiter;
