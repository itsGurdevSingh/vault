import { GarbageCollector } from "./garbageCollector.js";
import { GarbageCleaner } from "./garbageCleaner.js";
import { utils } from "./utils.js";

export class GarbageManagerFactory {
    constructor({ snapshotBuilder, garbagePort, rotationPolicyPort, cryptoEngine, rotationLockRepository, janitor, stores, logger = console }) {
        this.domainSnapshotBuilder = snapshotBuilder;  // domain
        this.janitor = janitor; // domain
        this.rotationPolicyPort = rotationPolicyPort; //port
        this.garbagePort = garbagePort; // port
        this.rotationLockRepository = rotationLockRepository; // infra
        this.cryptoEngine = cryptoEngine; // infra
        this.stores = stores; // infra
        this.logger = logger; // infra
    }

    #createCollector() {
        return new GarbageCollector({
            domainSnapshotBuilder: this.domainSnapshotBuilder,
            garbagePort: this.garbagePort,
            rotationPolicyPort: this.rotationPolicyPort,
            cryptoEngine: this.cryptoEngine,
            rotationLockRepository: this.rotationLockRepository,
            utils,
            logger: this.logger
        });
    }
    #createCleaner() {
        return new GarbageCleaner({
            domainSnapshotBuilder: this.domainSnapshotBuilder,
            garbagePort: this.garbagePort,
            janitor: this.janitor,
            Stores: this.Stores,
            utils,
            logger: this.logger
        });
    }

    static getInstance({ snapshotBuilder, garbagePort, rotationPolicyPort, cryptoEngine, rotationLockRepository, janitor, stores, logger = console }) {
        if (!GarbageManagerFactory.instance) {
            GarbageManagerFactory.instance = new GarbageManagerFactory({ snapshotBuilder, garbagePort, rotationPolicyPort, cryptoEngine, rotationLockRepository, janitor, stores, logger });
        }
        return GarbageManagerFactory.instance;
    }

    create() {
        const collector = this.#createCollector();
        const cleaner = this.#createCleaner();
        return { collector, cleaner };
    }

}


