export class JanitorService {
    constructor({ keyManager }) {
        this.keyManager = keyManager;
    }
    async cleanupExpiredKeys() {
        return this.keyManager.cleanupExpiredKeys();
    }
}