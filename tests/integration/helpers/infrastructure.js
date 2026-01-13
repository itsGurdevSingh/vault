/**
 * Test Infrastructure: Create "Outside" Dependencies for KeyManager
 * 
 * Creates the real infrastructure components that should be injected into ManagerFactory:
 * - pathService (filesystem operations)
 * - cryptoEngine (crypto operations)
 * - lockRepo (Redis mock for rotation locks)
 * - policyRepo (MongoDB mock for rotation policies)
 * - Cache (constructor for cache instances)
 * - activeKidStore (state management for active KIDs)
 * 
 * RULE: These are the ONLY outsider dependencies.
 * Everything else is created internally by ManagerFactory.
 */

import crypto from 'crypto';
import { CryptoEngine } from '../../../src/infrastructure/cryptoEngine/CryptoEngine.js';
import { CryptoConfig } from '../../../src/infrastructure/cryptoEngine/cryptoConfig.js';
import { KIDFactory } from '../../../src/infrastructure/cryptoEngine/KIDFactory.js';
import { TokenBuilder } from '../../../src/infrastructure/cryptoEngine/tokenBuilder.js';
import * as cryptoUtils from '../../../src/infrastructure/cryptoEngine/utils.js';
import { Cache } from '../../../src/utils/cache.js';
import { activeKidStore } from '../../../src/state/ActiveKIDState.js';
import { ManagerFactory } from '../../../src/domain/key-manager/index.js';
import { MetadataFactory } from '../../../src/domain/key-manager/modules/metadata/index.js';
import { GeneratorFactory } from '../../../src/domain/key-manager/modules/generator/index.js';
import { LoaderFactory } from '../../../src/domain/key-manager/modules/loader/index.js';
import { BuilderFactory } from '../../../src/domain/key-manager/modules/builder/index.js';
import { SignerFactory } from '../../../src/domain/key-manager/modules/signer/index.js';
import { JanitorFactory } from '../../../src/domain/key-manager/modules/janitor/index.js';
import { RotationFactory } from '../../../src/domain/key-manager/modules/keyRotator/index.js';

/**
 * Clears all factory singletons to ensure tests start with fresh instances
 */
export function clearFactorySingletons() {
    ManagerFactory._instance = null;
    MetadataFactory._instance = null;
    GeneratorFactory.instance = null;
    LoaderFactory._instance = null;
    BuilderFactory._instance = null;
    SignerFactory._instance = null;
    JanitorFactory.instance = null;
    RotationFactory.schedulerInstance = null;
}

/**
 * Creates test infrastructure dependencies for ManagerFactory
 * @param {Object} testPaths - Test storage paths from createTestKeyPaths() - MUST be provided to use test storage
 * @returns {Object} Infrastructure object with all "outsider" dependencies
 */
export function createTestInfrastructure(testPaths) {
    // 1. PATH SERVICE (Filesystem operations - USE TEST PATHS, not production pathService!)
    // The testPaths object IS our pathService for tests - it has all the required methods
    const fileSystemService = testPaths;

    // 2. CRYPTO ENGINE (All cryptographic operations)
    const kidFactory = new KIDFactory({
        randomBytes: crypto.randomBytes.bind(crypto)
    });

    const tokenBuilder = new TokenBuilder(cryptoUtils);

    const cryptoEngine = new CryptoEngine({
        cryptoModule: crypto,
        config: CryptoConfig,
        utils: cryptoUtils,
        tokenBuilder: tokenBuilder,
        kidFactory: kidFactory,
    });

    // 3. LOCK REPOSITORY (Mock Redis for rotation locks)
    const lockRepo = {
        acquireLock: async (domain) => true,
        releaseLock: async (domain) => true,
        acquire: async (domain, ttl) => 'mock-lock-token',
        release: async (domain, token) => true,
    };

    // 4. POLICY REPOSITORY (Mock MongoDB for rotation policies)
    const policyRepo = {
        findDueForRotation: async () => [],
        getDueForRotation: async () => [], // For scheduleRotation
        updateLastRotated: async (domain) => true,
        getPolicy: async (domain) => null,
        findByDomain: async (domain) => ({
            domain,
            rotationInterval: 90 * 24 * 60 * 60 * 1000, // 90 days 
            lastRotated: new Date()
        }),
        savePolicy: async (domain, policy) => true,
        getSession: async () => ({
            startTransaction: () => { },
            commitTransaction: async () => { },
            abortTransaction: async () => { },
            endSession: async () => { }
        }),
        acknowledgeSuccessfulRotation: async (data, session) => true,
    };

    // 5. CACHE CONSTRUCTOR (For creating cache instances)
    const CacheConstructor = Cache;

    // 6. ACTIVE KID STORE (State management)
    const kidStore = activeKidStore;

    return {
        pathService: fileSystemService,
        cryptoEngine,
        lockRepo,
        policyRepo,
        Cache: CacheConstructor,
        activeKidStore: kidStore
    };
}
