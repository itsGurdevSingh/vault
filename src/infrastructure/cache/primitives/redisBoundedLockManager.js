export class RedisBoundedLockManager {
    constructor({ prefix, limit, redisClient }) {
        if (!prefix || typeof prefix !== "string") {
            throw new Error("prefix must be a non-empty string");
        }
        if (!Number.isInteger(limit) || limit <= 0) {
            throw new Error("limit must be a positive integer");
        }
        if (!redisClient) {
            throw new Error("redisClient is required");
        }

        this.prefix = prefix.endsWith(":") ? prefix : `${prefix}:`;
        this.indexKey = `${this.prefix}__index__`;
        this.limit = limit;
        this.redis = redisClient;
    }

    _lockKey(key) {
        return `${this.prefix}${key}`;
    }

    /**
     * Acquire a lock if:
     * - lock does not already exist
     * - total active locks < limit
     *
     * Returns true if acquired, false otherwise
     */
    async acquire(key, token, ttlSeconds) {
        const lockKey = this._lockKey(key);

        const script = `
            -- KEYS[1] = indexKey
            -- KEYS[2] = lockKey
            -- ARGV[1] = token
            -- ARGV[2] = ttlSeconds
            -- ARGV[3] = limit

            -- 1. Cleanup stale index entries
            local keys = redis.call('LRANGE', KEYS[1], 0, -1)
            for _, k in ipairs(keys) do
                if redis.call('EXISTS', k) == 0 then
                    redis.call('LREM', KEYS[1], 0, k)
                end
            end

            -- 2. Enforce global lock limit
            local count = redis.call('LLEN', KEYS[1])
            if count >= tonumber(ARGV[3]) then
                return 0
            end

            -- 3. Try to acquire lock
            local ok = redis.call('SET', KEYS[2], ARGV[1], 'NX', 'EX', ARGV[2])
            if not ok then
                return 0
            end

            -- 4. Track lock
            redis.call('RPUSH', KEYS[1], KEYS[2])
            return 1
        `;

        const res = await this.redis.eval(
            script,
            2,
            this.indexKey,
            lockKey,
            token,
            ttlSeconds,
            this.limit
        );

        return res === 1;
    }

    /**
     * Release lock only if token matches
     */
    async release(key, token) {
        const lockKey = this._lockKey(key);

        const script = `
            -- KEYS[1] = lockKey
            -- KEYS[2] = indexKey
            -- ARGV[1] = token

            if redis.call('GET', KEYS[1]) == ARGV[1] then
                redis.call('DEL', KEYS[1])
                redis.call('LREM', KEYS[2], 0, KEYS[1])
                return 1
            end
            return 0
        `;

        const res = await this.redis.eval(
            script,
            2,
            lockKey,
            this.indexKey,
            token
        );

        return res === 1;
    }

    /**
     * Optional: observability/debugging
     */
    async activeLockCount() {
        return this.redis.llen(this.indexKey);
    }

    /**
     * Hard reset (admin / tests only)
     */
    async clearAll() {
        const keys = await this.redis.lrange(this.indexKey, 0, -1);
        if (keys.length) {
            await this.redis.del(...keys);
        }
        await this.redis.del(this.indexKey);
    }
}
