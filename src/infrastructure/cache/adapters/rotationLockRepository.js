import crypto from "crypto";

export class RotationLockRepository {
    constructor({ lockManager }) {
        this.lockManager = lockManager;
    }

    async acquire(domain, ttlSeconds) {
        const token = crypto.randomUUID();
        const ok = await this.lockManager.acquire(domain, token, ttlSeconds);
        return ok ? token : null;
    }

    async release(domain, token) {
        return this.lockManager.release(domain, token);
    }
}

