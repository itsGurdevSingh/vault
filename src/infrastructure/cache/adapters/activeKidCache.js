export class ActiveKidCache {
    constructor({ inMemoryCache, distributedCache, repository, ttlSeconds = 3600 }) {
        this.inMemoryCache = inMemoryCache;
        this.distributedCache = distributedCache;
        this.repo = repository;
        this.ttlSeconds = ttlSeconds;
    }

    async set(domain, kid) {
        // first check in repo domain exist with that active kid
        const policy = await this.repo.findByDomain(domain);
        if (!policy) {
            throw new Error(`No policy found for domain: ${domain}`);
        }

        // our cache have not athority to set active kid not exist in policy
        // this ensure active kid consistency between repo and cache
        if (policy.activeKid !== kid) {
            policy.activeKid = kid;
            throw new Error(`Active KID mismatch for domain: ${domain}`);
        }
        // set in outside cache with per-prefix limit
        await this.distributedCache.set(domain, kid, this.ttlSeconds);
        // finally set in in-memory cache
        this.inMemoryCache.set(domain, kid);
        return kid;
    }

    async get(domain) {
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

    async delete(domain) {
        this.inMemoryCache.delete(domain);
        await this.distributedCache.del(domain);
    }

    async clearAll() {
        this.inMemoryCache.clear();
        await this.distributedCache.clear();
    }
}

