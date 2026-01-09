import { RotationScheduler } from "./RotationScheduler";
import { Rotator } from "./rotator";

class RotationFactory {
    constructor({ keyGenerator, keyJanitor, keyResolver, metadataManager, LockRepo }, { state, policyRepo }) {
        // Rotator Dependencies
        this.keyGenerator = keyGenerator;
        this.keyJanitor = keyJanitor;
        this.keyResolver = keyResolver;
        this.metadataManager = metadataManager;
        this.LockRepo = LockRepo;
        // Scheduler Dependencies
        this.state = state;
        this.policyRepo = policyRepo;
    }

    create() {
        const keyRotator = Rotator({ keyGenerator, keyJanitor, keyResolver, metadataManager, LockRepo });
        return new RotationScheduler(keyRotator, this.policyRepo, this.state);
    }

    static getInstances({ keyGenerator, keyJanitor, keyResolver, metadataManager, LockRepo }, { state, policyRepo }) {
        if (!this.schedulerInstance) {
            this.schedulerInstance = new RotationFactory({ keyGenerator, keyJanitor, keyResolver, metadataManager, LockRepo }, { state, policyRepo });
        }
        return this.schedulerInstance
    }
}

export { RotationFactory };

