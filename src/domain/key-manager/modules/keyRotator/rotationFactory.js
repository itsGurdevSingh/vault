import { RotationScheduler } from "./rotationScheduler.js";
import { Rotator } from "./rotator.js";

class RotationFactory {
    constructor({ keyGenerator, keyJanitor, keyResolver, metadataManager, lockRepository }, { state, policyRepo }) {
        // Rotator Dependencies
        this.keyGenerator = keyGenerator;
        this.keyJanitor = keyJanitor;
        this.keyResolver = keyResolver;
        this.metadataManager = metadataManager;
        this.lockRepository = lockRepository;
        // Scheduler Dependencies
        this.state = state;
        this.policyRepo = policyRepo;
    }

    create() {
        const keyRotator = new Rotator({
            keyGenerator: this.keyGenerator,
            keyJanitor: this.keyJanitor,
            keyResolver: this.keyResolver,
            metadataManager: this.metadataManager,
            lockRepository: this.lockRepository
        });
        return new RotationScheduler(keyRotator, this.policyRepo, this.state);
    }

    static getInstance({ keyGenerator, keyJanitor, keyResolver, metadataManager, lockRepository }, { state, policyRepo }) {
        if (!this.schedulerInstance) {
            this.schedulerInstance = new RotationFactory({ keyGenerator, keyJanitor, keyResolver, metadataManager, lockRepository }, { state, policyRepo });
        }
        return this.schedulerInstance
    }
}

export { RotationFactory };

