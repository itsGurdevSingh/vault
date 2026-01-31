import { Rotator } from "./rotator.js";

class RotationFactory {
    constructor({ keyGenerator, keyJanitor, keyResolver, metadataManager, lockRepository }) {
        this.keyGenerator = keyGenerator;
        this.keyJanitor = keyJanitor;
        this.keyResolver = keyResolver;
        this.metadataManager = metadataManager;
        this.lockRepository = lockRepository;
    }

    create() {
        return new Rotator({
            keyGenerator: this.keyGenerator,
            keyJanitor: this.keyJanitor,
            keyResolver: this.keyResolver,
            metadataManager: this.metadataManager,
            lockRepository: this.lockRepository
        });
    }

    static getInstance(dipendencies) {
        if (!this._instance) {
            this._instance = new RotationFactory(dipendencies);
        }
        return this._instance;
    }
}

export { RotationFactory };

