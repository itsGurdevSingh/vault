export class RotationService {
    constructor({ keyManager }) {
        this.keyManager = keyManager;
    }
    async runScheduled() {
        return this.keyManager.scheduleRotation();
    }
}