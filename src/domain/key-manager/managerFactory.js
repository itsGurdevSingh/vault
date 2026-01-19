// internal utils imports
import { KeyResolver } from "./utils/keyResolver.js";
import { domainNormalizer } from "./utils/domainNormalizer.js";
// module factory imports
import { MetadataFactory } from "./modules/metadata/index.js";
import { LoaderFactory } from "./modules/loader/index.js";
import { JanitorFactory } from "./modules/janitor/index.js";
import { BuilderFactory } from "./modules/builder/index.js";
import { GeneratorFactory } from "./modules/generator/index.js";
import { SignerFactory } from "./modules/signer/index.js";
import { RotationFactory } from "./modules/keyRotator/index.js";
// domain init import
import { initializeDomain } from "./init/initlizeDomain.js";
// state and config imports
import { RotationState } from "./config/RotationState.js";
import { RotationConfig } from "./config/RotationConfig.js";
// main manager import Public Facade
import { KeyManager } from "./KeyManager.js";

class ManagerFactory {
    // Infra and outsider utils 
    constructor({ pathService, cryptoEngine, lockRepo, policyRepo, Cache, activeKidStore }) {
        this.pathService = pathService;
        this.cryptoEngine = cryptoEngine;
        this.lockRepository = lockRepo;
        this.policyRepository = policyRepo;
        this.cache = Cache;
        this.kidStore = activeKidStore;
    }

    static getInstance({ pathService, cryptoEngine, lockRepo, policyRepo, Cache, activeKidStore }) {
        if (!this._instance) {
            this._instance = new ManagerFactory({ pathService, cryptoEngine, lockRepo, policyRepo, Cache, activeKidStore });
        }
        return this._instance;
    }

    async create() {
        // 1. INFRASTRUCTURE (The Foundation)
        const cryptoEngine = this.cryptoEngine; // Use the instance directly

        // 2. SHARED STATE (The Memory)
        const builderCache = new this.cache();
        const signerCache = new this.cache();
        const loaderCache = {
            private: new this.cache(),
            public: new this.cache()
        };


        // 3. EXTERNAL DOMAINS (Dependencies from neighbors)
        // We must create MetadataManager first because Janitor & Generator need it.
        const metaFactory = MetadataFactory.getInstance({ pathService: this.pathService });
        const metadataManager = metaFactory.create();

        // 4. SUB-DOMAIN: LOADER (Read Access)
        const loaderFactory = LoaderFactory.getInstance({ loaderCache, pathService: this.pathService, cryptoEngine });
        const loader = await loaderFactory.create();

        // 5. INTERNAL SERVICE: RESOLVER (Helper)
        const keyResolver = new KeyResolver({ loader, kidStore: this.kidStore });

        // 6. SUB-DOMAIN: GENERATOR (Write Access)
        const generatorFactory = GeneratorFactory.getInstance({ cryptoEngine, metadataManager, pathService: this.pathService });
        const generator = generatorFactory.create();

        // 7. SUB-DOMAIN: JANITOR (Cleanup)
        const janitorFactory = JanitorFactory.getInstance({ cache: { loaderCache, builderCache, signerCache }, metadataManager, pathService: this.pathService });
        const janitor = janitorFactory.create();

        // 8. SUB-DOMAIN: BUILDER (Construction)
        const builderFactory = BuilderFactory.getInstance({ cache: builderCache, loader, cryptoEngine });
        const builder = builderFactory.create();

        // 9. SUB-DOMAIN: SIGNER (Usage)
        const signerFactory = SignerFactory.getInstance({ cache: signerCache, keyResolver, cryptoEngine });
        const signer = signerFactory.create();

        //10. sub-DOMAIN: Rotation scheduler (Key Rotation)
        const rotationFactory = RotationFactory.getInstance(
            { keyGenerator: generator, keyJanitor: janitor, keyResolver, metadataManager, lockRepository: this.lockRepository },
            { state: RotationState, policyRepo: this.policyRepository }
        );
        const rotationScheduler = rotationFactory.create();

        // 11. config manager 
        const configManager = RotationConfig.getInstance({ state: RotationState });

        //12. intial setup of doamin .
        const domainInitializer = initializeDomain.getInstance({ state: RotationState, generator, keyResolver, policyRepo: this.policyRepository });

        // 13. THE AGGREGATE ROOT (The Boss)
        // We inject all the working parts into the Manager
        return new KeyManager({
            builder,
            signer,
            janitor,
            rotationScheduler,
            configManager,
            domainInitializer,
            normalizer: domainNormalizer
        });
    }
}

export { ManagerFactory };