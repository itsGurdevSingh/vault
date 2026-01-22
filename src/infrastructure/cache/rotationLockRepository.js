import redis from "./redisClient.js";
import RedisPrefixLimiter from "./redisPrefixLimiter.js";
import crypto from 'crypto';


const lockLimiter = new RedisPrefixLimiter({ prefix: 'rotation_lock:', limit: 2000, redisClient: redis });

class RotationLockRepository {
    /** acquire lock for rotation domain base */
    async acquire(domain, ttlSeconds) {
        const token = crypto.randomUUID();
        // Try to set lock with NX (only if not exists)
        const key = domain;
        const result = await redis.set(`rotation_lock:${key}`, token, "NX", "EX", ttlSeconds);
        if (result === "OK") {
            // Track in limiter for per-prefix limit
            await lockLimiter.set(key, token);
            return token;
        }
        return null;
    }

    /** release lock for rotation domain base */
    async release(domain, token) {
        const key = `rotation_lock:${domain}`;
        // Safe delete using Lua
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1]
            then return redis.call("del", KEYS[1])
            else return 0 end
        `;
        const result = await redis.eval(script, 1, key, token);
        if (result) {
            await lockLimiter.del(domain);
        }
        return result;
    }
}

export const rotationLockRepository = new RotationLockRepository();
