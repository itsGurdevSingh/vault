import { rotationPolicyRepository } from "../db/repositories/rotationPolicyRepository.js";
import { Cache } from "../utils/cache.js";
import RedisBoundedStore from "./redisBoundedStore.js";
import redis from "./redisClient.js";


class ActiveKidCache {
    constructor({ inMemoryCache, distributedCache, repository, ttlSeconds = 3600 }) {
        this.inMemoryCache = inMemoryCache;
        this.distributedCache = distributedCache;
        this.repo = repository;
        this.ttlSeconds = ttlSeconds;
    }

    async setActiveKid(domain, kid) {
        // set in outside cache with per-prefix limit
        await this.distributedCache.set(domain, kid, this.ttlSeconds);
        // finally set in in-memory cache
        this.inMemoryCache.set(domain, kid);
        return kid;
    }

    async getActiveKid(domain) {
        // check in-memory cache first
        let kid = this.inMemoryCache.get(domain);
        if (kid) return kid;
        // then check outside cache
        kid = await this.distributedCache.get(domain);
        if (kid) {
            this.inMemoryCache.set(domain, kid);
            return kid;
        }
        // finally fetch from repo
        const policy = await this.repo.findByDomain(domain);
        if (policy) {
            kid = policy.activeKid;
            // set in both caches
            this.inMemoryCache.set(domain, kid);
            await this.distributedCache.set(domain, kid, this.ttlSeconds);
            return kid;
        }
        return null;
    }

    async clearActiveKid(domain) {
        this.inMemoryCache.delete(domain);
        await this.distributedCache.del(domain);
    }

    async clearAll() {
        this.inMemoryCache.clear();
        await this.distributedCache.clear();
    }
}

// intialize (this will perform in index or factory later)
const REDIS_LIMIT = 1000;
const inMemoryCache = new Cache({ limit: 1000 });
const distributedCache = new RedisBoundedStore({ prefix: 'active_kid:', limit: REDIS_LIMIT, redisClient: redis });

export const activeKidStore = new ActiveKidCache({ inMemoryCache, distributedCache, repository: rotationPolicyRepository, ttlSeconds: 2 * 3600 });
