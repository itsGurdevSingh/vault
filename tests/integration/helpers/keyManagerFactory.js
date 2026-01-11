/**
 * Test Helper: KeyManager Factory for Integration Tests
 * 
 * Creates a fully functional KeyManager instance with real dependencies
 * for facade-level integration testing.
 */

import crypto from 'crypto';
import { KeyResolver } from '../../../src/domain/key-manager/utils/keyResolver.js';
import { domainNormalizer } from '../../../src/domain/key-manager/utils/domainNormalizer.js';
import { MetadataFactory } from '../../../src/domain/key-manager/modules/metadata/index.js';
import { LoaderFactory } from '../../../src/domain/key-manager/modules/loader/index.js';
import { JanitorFactory } from '../../../src/domain/key-manager/modules/janitor/index.js';
import { BuilderFactory } from '../../../src/domain/key-manager/modules/builder/index.js';
import { GeneratorFactory } from '../../../src/domain/key-manager/modules/generator/index.js';
import { SignerFactory } from '../../../src/domain/key-manager/modules/signer/index.js';
import { RotationFactory } from '../../../src/domain/key-manager/modules/keyRotator/index.js';
import { RotationState } from '../../../src/domain/key-manager/config/RotationState.js';
import { RotationConfig } from '../../../src/domain/key-manager/config/RotationConfig.js';
import { KeyManager } from '../../../src/domain/key-manager/KeyManager.js';
import { CryptoEngine } from '../../../src/infrastructure/cryptoEngine/CryptoEngine.js';
import { CryptoConfig } from '../../../src/infrastructure/cryptoEngine/cryptoConfig.js';
import { KIDFactory } from '../../../src/infrastructure/cryptoEngine/KIDFactory.js';
import { TokenBuilder } from '../../../src/infrastructure/cryptoEngine/tokenBuilder.js';
import * as cryptoUtils from '../../../src/infrastructure/cryptoEngine/utils.js';
import { Cache } from '../../../src/utils/cache.js';
import { activeKidStore } from '../../../src/state/ActiveKIDState.js';

/**
 * Creates a test KeyManager instance with real dependencies
 * @param {Object} testPaths - Test file paths from createTestKeyPaths()
 * @param {Object} options - Optional overrides for testing
 * @returns {KeyManager} Fully functional KeyManager facade
 */
export async function createTestKeyManager(testPaths, options = {}) {
    // 1. INFRASTRUCTURE (Real crypto operations)
    const kidFactory = new KIDFactory({ randomBytes: crypto.randomBytes.bind(crypto) });
    const tokenBuilder = new TokenBuilder(cryptoUtils);
    const cryptoEngine = new CryptoEngine({
        cryptoModule: crypto,
        config: CryptoConfig,
        utils: cryptoUtils,
        tokenBuilder: tokenBuilder,
        kidFactory: kidFactory,
    });

    // 2. SHARED STATE (In-memory caches)
    const builderCache = new Cache();
    const signerCache = new Cache();
    const loaderCache = {
        private: new Cache(),
        public: new Cache(),
    };

    // 3. METADATA MODULE (Create first - needed by others)
    const metadataFactory = new MetadataFactory(testPaths);
    const metadataService = metadataFactory.create();

    // 4. GENERATOR MODULE (Key generation + storage)
    const generatorFactory = new GeneratorFactory(
        cryptoEngine,
        metadataService,
        testPaths
    );
    const generator = generatorFactory.create();

    // 5. LOADER MODULE (Key loading with cache) - FIXED: correct params + await
    const loaderFactory = new LoaderFactory(loaderCache, testPaths, cryptoEngine);
    const loader = await loaderFactory.create();

    // 6. BUILDER MODULE (JWKS generation with cache) - FIXED: correct parameter order
    const builderFactory = new BuilderFactory(builderCache, loader, cryptoEngine);
    const builder = builderFactory.create();

    // 7. KEY RESOLVER (Active KID management)
    const keyResolver = new KeyResolver({
        loader,
        kidStore: activeKidStore
    });

    // 8. SIGNER MODULE (JWT signing) - FIXED: correct parameter order
    const signerFactory = new SignerFactory(
        signerCache,
        keyResolver,
        cryptoEngine
    );
    const signer = signerFactory.create();

    // 9. JANITOR MODULE (Cleanup operations)
    const janitorFactory = new JanitorFactory(
        testPaths,
        metadataService,
        signerCache,
        loaderCache,
        builderCache
    );
    const janitor = janitorFactory.create();

    // 10. ROTATION MODULE (Key rotation orchestration)
    // Mock repositories for testing (or use options to inject real ones)
    const mockLockRepo = options.lockRepo || {
        acquireLock: async (domain) => true,
        releaseLock: async (domain) => true,
    };
    const mockPolicyRepo = options.policyRepo || {
        findDueForRotation: async () => [],
        updateLastRotated: async (domain) => true,
    };

    const rotationFactory = new RotationFactory(
        generator,
        janitor,
        activeKidStore,
        mockLockRepo,
        mockPolicyRepo,
        loader
    );
    const rotator = rotationFactory.createRotator();
    const scheduler = rotationFactory.createScheduler();

    // 11. CONFIGURATION MANAGER
    const configManager = new RotationConfig({ state: RotationState });

    // 12. ASSEMBLE KEY MANAGER FACADE
    const keyManager = new KeyManager({
        loader,
        generator,
        janitor,
        builder,
        signer,
        keyRotator: rotator,
        rotationScheduler: scheduler,
        keyResolver,
        configManager,
        normalizer: domainNormalizer,
    });

    return keyManager;
}

/**
 * Creates a minimal KeyManager for quick testing
 * (without rotation features)
 */
export async function createMinimalKeyManager(testPaths) {
    const kidFactory = new KIDFactory({ randomBytes: crypto.randomBytes.bind(crypto) });
    const tokenBuilder = new TokenBuilder(cryptoUtils);
    const cryptoEngine = new CryptoEngine({
        cryptoModule: crypto,
        config: CryptoConfig,
        utils: cryptoUtils,
        tokenBuilder: tokenBuilder,
        kidFactory: kidFactory,
    });

    const builderCache = new Cache();
    const signerCache = new Cache();
    const loaderCache = { private: new Cache(), public: new Cache() };

    const metadataFactory = new MetadataFactory(testPaths);
    const metadataService = metadataFactory.create();

    const generatorFactory = new GeneratorFactory(cryptoEngine, metadataService, testPaths);
    const generator = generatorFactory.create();

    const loaderFactory = new LoaderFactory(loaderCache, testPaths, cryptoEngine);
    const loader = await loaderFactory.create();

    const builderFactory = new BuilderFactory(builderCache, loader, cryptoEngine);
    const builder = builderFactory.create();

    const keyResolver = new KeyResolver({
        loader,
        kidStore: activeKidStore
    });

    const signerFactory = new SignerFactory(signerCache, keyResolver, cryptoEngine);
    const signer = signerFactory.create();

    const janitorFactory = new JanitorFactory(
        testPaths,
        metadataService,
        signerCache,
        loaderCache,
        builderCache
    );
    const janitor = janitorFactory.create();

    const configManager = new RotationConfig({ state: RotationState });

    return new KeyManager({
        loader,
        generator,
        janitor,
        builder,
        signer,
        keyRotator: null,
        rotationScheduler: null,
        keyResolver,
        configManager,
        normalizer: domainNormalizer,
    });
}
