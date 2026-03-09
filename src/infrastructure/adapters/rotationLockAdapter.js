import { RotationLockPort } from "../../application/ports/rotationLockPort.js";

export class RotationLockAdapter extends RotationLockPort {
    constructor({ cache }) {
        super();
        this.cache = cache;
    }
    async acquireLock(domain) {
        return this.cache.acquireLock(domain);
    }
    async releaseLock(domain) {
        return this.cache.releaseLock(domain);
    }
}