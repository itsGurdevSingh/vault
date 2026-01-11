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
// state and config imports
import { RotationState } from "./config/RotationState.js";
import { RotationConfig } from "./config/RotationConfig.js";
// main manager import Public Facade
import { KeyManager } from "./KeyManager.js";

class ManagerFactory {
    // unfra and outsider utils 
    constructor(pathService, cryptoEngine, lockRepository, policyRepo, cache, state) {
        this.pathService = pathService;
        this.cryptoEngine = cryptoEngine;
        this.lockRepository = lockRepository;
        this.policyRepo = policyRepo;
        this.cache = cache;
        this.kidStore = state;
    }

    static getInstance(pathService, cryptoEngine, lockRepository, policyRepo, cache) {
        if (!this._instance) {
            this._instance = new ManagerFactory(pathService, cryptoEngine, lockRepository, policyRepo, cache);
        }
        return this._instance;
    }

    create() {
        // 1. INFRASTRUCTURE (The Foundation)
        const cryptoEngine = new this.cryptoEngine(); // Or .getInstance() if singleton

        // 2. SHARED STATE (The Memory)
        const builderCache = new this.cache();
        const signerCache = new this.cache();
        const loaderCache = {
            private: new this.cache(),
            public: new this.cache()
        };


        // 3. EXTERNAL DOMAINS (Dependencies from neighbors)
        // We must create MetadataManager first because Janitor & Generator need it.
        const metaFactory = MetadataFactory.getInstance(this.pathService);
        const metadataManager = metaFactory.create();

        // 4. SUB-DOMAIN: LOADER (Read Access)
        const loaderFactory = LoaderFactory.getInstance(loaderCache, this.pathService, cryptoEngine);
        const loader = loaderFactory.create();

        // 5. INTERNAL SERVICE: RESOLVER (Helper)
        const keyResolver = new KeyResolver({ loader, kidStore: this.kidStore });

        // 6. SUB-DOMAIN: GENERATOR (Write Access)
        const generatorFactory = GeneratorFactory.getInstance(cryptoEngine, metadataManager);
        const generator = generatorFactory.create();

        // 7. SUB-DOMAIN: JANITOR (Cleanup)
        const janitorFactory = JanitorFactory.getInstance({ loaderCache, builderCache, signerCache }, metadataManager, this.pathService);
        const janitor = janitorFactory.create();

        // 8. SUB-DOMAIN: BUILDER (Construction)
        const builderFactory = BuilderFactory.getInstance(builderCache, loader, cryptoEngine);
        const builder = builderFactory.create();

        // 9. SUB-DOMAIN: SIGNER (Usage)
        const signerFactory = SignerFactory.getInstance(signerCache, keyResolver, cryptoEngine);
        const signer = signerFactory.create();

        //10. sub-DOMAIN: Rotation scheduler (Key Rotation)
        const rotationFactory = RotationFactory.getInstance(
            { keyGenerator: generator, keyJanitor: janitor, keyResolver, metadataManager, lockRepository: this.lockRepository },
            { state: RotationState, policyRepo: this.policyRepo }
        );
        const rotationScheduler = rotationFactory.create();

        // 11. config manager 
        const configManager = RotationConfig.getInstance({ RotationState });


        // 11. THE AGGREGATE ROOT (The Boss)
        // We inject all the working parts into the Manager
        return new KeyManager({
            loader,
            generator,
            janitor,
            builder,
            signer,
            keyResolver,
            rotationScheduler,
            keyResolver,
            configManager: configManager,
            normalizer: domainNormalizer
        });
    }
}

export { ManagerFactory };