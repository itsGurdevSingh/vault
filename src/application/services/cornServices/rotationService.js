export class RotationService {
    constructor({ rotationScheduler }) {
        this.scheduler = rotationScheduler;
    }
    async runScheduled() {
        return await this.scheduler.runScheduledRotation();
    }
}
