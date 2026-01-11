import redis from "./redisClient.js";
import crypto from 'crypto';

class RotationLockRepo {

    /** acquire lock for rotation domain base */
    async acquire(domain, ttlSeconds) {
        const key = `rotation_lock:${domain}`;
        const token = crypto.randomUUID();

        const result = await redis.set(key, token, "NX", "EX", ttlSeconds);
        return result === "OK" ? token : null;
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

        return await redis.eval(script, 1, key, token);
    }
}

export const rotationLockRepo = new RotationLockRepo();
