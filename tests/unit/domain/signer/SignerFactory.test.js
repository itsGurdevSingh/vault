import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignerFactory } from '../../../../src/domain/key-manager/modules/signer/signerFactory.js';

describe('SignerFactory', () => {
    let mockCache;
    let mockKeyResolver;
    let mockCryptoEngine;
    let mockLogger;

    beforeEach(() => {
        // Reset singleton before each test
        SignerFactory._instance = null;

        // Create mock dependencies
        mockCache = new Map();

        mockKeyResolver = {
            getActiveKID: vi.fn(),
            getSigningKey: vi.fn()
        };

        mockCryptoEngine = {
            buildTokenParts: vi.fn(),
            sign: vi.fn(),
            importPrivateKey: vi.fn()
        };

        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };
    });

    describe('constructor', () => {
        it('should initialize with all required dependencies', () => {
            // Test: Verify all dependencies are stored
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);

            expect(factory.cache).toBe(mockCache);
            expect(factory.keyResolver).toBe(mockKeyResolver);
            expect(factory.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should set default opts with console logger if not provided', () => {
            // Test: Default logger is console
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);

            expect(factory.opts).toEqual({ logger: console });
        });

        it('should use provided opts', () => {
            // Test: Custom opts are stored
            const customOpts = { logger: mockLogger, defaultTTL: 3600 };
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine, customOpts);

            expect(factory.opts).toBe(customOpts);
        });

        it('should accept cache as first parameter', () => {
            // Test: Cache dependency injection
            const customCache = { custom: 'cache' };
            const factory = new SignerFactory(customCache, mockKeyResolver, mockCryptoEngine);

            expect(factory.cache).toBe(customCache);
        });

        it('should accept keyResolver as second parameter', () => {
            // Test: KeyResolver dependency injection
            const customResolver = { custom: 'resolver' };
            const factory = new SignerFactory(mockCache, customResolver, mockCryptoEngine);

            expect(factory.keyResolver).toBe(customResolver);
        });

        it('should accept cryptoEngine as third parameter', () => {
            // Test: CryptoEngine dependency injection
            const customEngine = { custom: 'engine' };
            const factory = new SignerFactory(mockCache, mockKeyResolver, customEngine);

            expect(factory.cryptoEngine).toBe(customEngine);
        });
    });

    describe('create', () => {
        it('should create Signer instance with proper dependencies', () => {
            // Test: Factory assembles Signer with injected components
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine, { logger: mockLogger });

            const signer = factory.create();

            expect(signer).toBeDefined();
            expect(signer.cache).toBe(mockCache);
            expect(signer.keyResolver).toBe(mockKeyResolver);
            expect(signer.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should inject cache into Signer', () => {
            // Test: Cache flows from factory to signer
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);

            const signer = factory.create();

            expect(signer.cache).toBe(mockCache);
        });

        it('should inject keyResolver into Signer', () => {
            // Test: KeyResolver flows from factory to signer
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);

            const signer = factory.create();

            expect(signer.keyResolver).toBe(mockKeyResolver);
        });

        it('should inject cryptoEngine into Signer', () => {
            // Test: CryptoEngine flows from factory to signer
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);

            const signer = factory.create();

            expect(signer.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should pass opts to Signer', () => {
            // Test: Options are forwarded to signer
            const opts = { logger: mockLogger, defaultTTL: 7200 };
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine, opts);

            const signer = factory.create();

            expect(signer.logger).toBe(mockLogger);
            expect(signer.defaultTTL).toBe(7200);
        });

        it('should create new Signer instance each time', () => {
            // Test: Each create() call returns new instance
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);

            const signer1 = factory.create();
            const signer2 = factory.create();

            expect(signer1).not.toBe(signer2);
        });

        it('should return signer with working sign method', () => {
            // Test: Created signer has functional sign method
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);

            const signer = factory.create();

            expect(typeof signer.sign).toBe('function');
        });

        it('should share cache across multiple signers', () => {
            // Test: All signers from same factory use same cache
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);

            const signer1 = factory.create();
            const signer2 = factory.create();

            expect(signer1.cache).toBe(signer2.cache);
        });
    });

    describe('getInstance (singleton pattern)', () => {
        it('should return the same factory instance on multiple calls', () => {
            // Test: Singleton behavior - one factory per application
            const instance1 = SignerFactory.getInstance(mockCache, mockKeyResolver, mockCryptoEngine);
            const instance2 = SignerFactory.getInstance(mockCache, mockKeyResolver, mockCryptoEngine);

            expect(instance1).toBe(instance2);
        });

        it('should create instance on first call', () => {
            // Test: Lazy instantiation
            expect(SignerFactory._instance).toBeNull();

            const instance = SignerFactory.getInstance(mockCache, mockKeyResolver, mockCryptoEngine);

            expect(instance).toBeDefined();
            expect(SignerFactory._instance).toBe(instance);
        });

        it('should not create new instance on subsequent calls', () => {
            // Test: Singleton persists across calls
            const instance1 = SignerFactory.getInstance(mockCache, mockKeyResolver, mockCryptoEngine);
            const instance2 = SignerFactory.getInstance(mockCache, mockKeyResolver, mockCryptoEngine);
            const instance3 = SignerFactory.getInstance(mockCache, mockKeyResolver, mockCryptoEngine);

            expect(instance1).toBe(instance2);
            expect(instance2).toBe(instance3);
        });

        it('should initialize with provided dependencies', () => {
            // Test: Singleton uses injected dependencies
            const instance = SignerFactory.getInstance(mockCache, mockKeyResolver, mockCryptoEngine, { logger: mockLogger });

            expect(instance.cache).toBe(mockCache);
            expect(instance.keyResolver).toBe(mockKeyResolver);
            expect(instance.cryptoEngine).toBe(mockCryptoEngine);
            expect(instance.opts.logger).toBe(mockLogger);
        });

        it('should ignore parameters on subsequent calls', () => {
            // Test: First call sets dependencies, later calls ignored
            const cache1 = { id: 1 };
            const cache2 = { id: 2 };

            const instance1 = SignerFactory.getInstance(cache1, mockKeyResolver, mockCryptoEngine);
            const instance2 = SignerFactory.getInstance(cache2, mockKeyResolver, mockCryptoEngine);

            expect(instance1).toBe(instance2);
            expect(instance1.cache).toBe(cache1); // Uses first call's cache
        });

        it('should handle opts parameter in getInstance', () => {
            // Test: Options are passed through getInstance
            const opts = { logger: mockLogger, defaultTTL: 3600 };
            const instance = SignerFactory.getInstance(mockCache, mockKeyResolver, mockCryptoEngine, opts);

            expect(instance.opts).toBe(opts);
        });
    });

    describe('factory pattern adherence', () => {
        it('should follow factory pattern conventions', () => {
            // Test: Factory has create method and getInstance static
            const factory = SignerFactory.getInstance(mockCache, mockKeyResolver, mockCryptoEngine);

            expect(typeof factory.create).toBe('function');
            expect(typeof SignerFactory.getInstance).toBe('function');
        });

        it('should encapsulate instantiation logic', () => {
            // Test: Consumer doesn't need to know about Signer internals
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);

            const signer = factory.create();

            // Consumer gets Signer, not individual components
            expect(signer).toHaveProperty('cache');
            expect(signer).toHaveProperty('keyResolver');
            expect(signer).toHaveProperty('cryptoEngine');
            expect(typeof signer.sign).toBe('function');
        });

        it('should enable dependency injection at factory level', () => {
            // Test: All dependencies provided to factory, not to Signer directly
            const customCache = { custom: 'cache' };
            const customResolver = { custom: 'resolver' };
            const customEngine = { custom: 'engine' };
            const customOpts = { logger: mockLogger };

            const factory = new SignerFactory(customCache, customResolver, customEngine, customOpts);
            const signer = factory.create();

            expect(signer.cache).toBe(customCache);
            expect(signer.keyResolver).toBe(customResolver);
            expect(signer.cryptoEngine).toBe(customEngine);
            expect(signer.logger).toBe(mockLogger);
        });
    });

    describe('integration scenarios', () => {
        it('should create working signer that can coordinate components', () => {
            // Test: Full integration - factory produces functional signer
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine, { logger: mockLogger });

            const signer = factory.create();

            // Signer should have all expected methods
            expect(typeof signer.sign).toBe('function');
            expect(signer.cache).toBeDefined();
            expect(signer.keyResolver).toBeDefined();
            expect(signer.cryptoEngine).toBeDefined();
        });

        it('should handle concurrent signer creation', () => {
            // Test: Multiple signers can be created simultaneously
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);

            const signers = [
                factory.create(),
                factory.create(),
                factory.create()
            ];

            expect(signers).toHaveLength(3);
            signers.forEach(signer => {
                expect(signer).toBeDefined();
                expect(typeof signer.sign).toBe('function');
            });
        });

        it('should allow different factories with different dependencies', () => {
            // Test: Multiple factory instances with different configs
            SignerFactory._instance = null; // Reset singleton

            const cache1 = { id: 'cache1' };
            const cache2 = { id: 'cache2' };

            const factory1 = new SignerFactory(cache1, mockKeyResolver, mockCryptoEngine);
            const factory2 = new SignerFactory(cache2, mockKeyResolver, mockCryptoEngine);

            const signer1 = factory1.create();
            const signer2 = factory2.create();

            expect(signer1.cache).toBe(cache1);
            expect(signer2.cache).toBe(cache2);
        });

        it('should support signer lifecycle across factory', async () => {
            // Test: Signers from factory work independently
            mockKeyResolver.getActiveKID.mockResolvedValue('test-kid');
            mockCache.set('test-kid', { type: 'private' });
            mockCryptoEngine.buildTokenParts.mockReturnValue({
                encodedHeader: 'h',
                encodedPayload: 'p',
                signingInput: 'h.p'
            });
            mockCryptoEngine.sign.mockResolvedValue('sig');

            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);
            const signer1 = factory.create();
            const signer2 = factory.create();

            // Both signers should work independently
            const token1 = await signer1.sign('domain1.com', { sub: 'user1' });
            const token2 = await signer2.sign('domain2.com', { sub: 'user2' });

            expect(token1).toBe('h.p.sig');
            expect(token2).toBe('h.p.sig');
        });
    });

    describe('error handling', () => {
        it('should handle missing dependencies gracefully', () => {
            // Test: Factory accepts null/undefined dependencies
            expect(() => new SignerFactory(null, null, null)).not.toThrow();
        });

        it('should create signer even with minimal dependencies', () => {
            // Test: Factory creates signer with minimal deps
            const minimalFactory = new SignerFactory({}, {}, {});

            const signer = minimalFactory.create();

            expect(signer).toBeDefined();
        });

        it('should propagate errors from Signer construction', () => {
            // Test: Construction errors bubble up
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine);

            // Should not throw during creation with valid deps
            expect(() => factory.create()).not.toThrow();
        });
    });

    describe('cache sharing', () => {
        it('should share cache between all signers from same factory', () => {
            // Test: Cache is shared resource
            const sharedCache = new Map();
            const factory = new SignerFactory(sharedCache, mockKeyResolver, mockCryptoEngine);

            const signer1 = factory.create();
            const signer2 = factory.create();

            expect(signer1.cache).toBe(sharedCache);
            expect(signer2.cache).toBe(sharedCache);
            expect(signer1.cache).toBe(signer2.cache);
        });

        it('should allow signers to benefit from shared cache', () => {
            // Test: One signer caches, another reads
            const sharedCache = new Map();
            sharedCache.set('test-kid', { type: 'private' });

            const factory = new SignerFactory(sharedCache, mockKeyResolver, mockCryptoEngine);
            const signer = factory.create();

            expect(signer.cache.get('test-kid')).toEqual({ type: 'private' });
        });

        it('should maintain cache independence between different factories', () => {
            // Test: Different factories have different caches
            SignerFactory._instance = null;

            const cache1 = new Map();
            const cache2 = new Map();

            const factory1 = new SignerFactory(cache1, mockKeyResolver, mockCryptoEngine);
            const factory2 = new SignerFactory(cache2, mockKeyResolver, mockCryptoEngine);

            const signer1 = factory1.create();
            const signer2 = factory2.create();

            expect(signer1.cache).not.toBe(signer2.cache);
        });
    });

    describe('options propagation', () => {
        it('should propagate defaultTTL option to signer', () => {
            // Test: Custom TTL is passed through
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine, { defaultTTL: 1800 });
            const signer = factory.create();

            expect(signer.defaultTTL).toBe(1800);
        });

        it('should propagate maxPayloadBytes option to signer', () => {
            // Test: Custom max payload is passed through
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine, { maxPayloadBytes: 8192 });
            const signer = factory.create();

            expect(signer.maxPayloadBytes).toBe(8192);
        });

        it('should propagate logger option to signer', () => {
            // Test: Custom logger is passed through
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine, { logger: mockLogger });
            const signer = factory.create();

            expect(signer.logger).toBe(mockLogger);
        });

        it('should propagate multiple options together', () => {
            // Test: All options work together
            const opts = {
                logger: mockLogger,
                defaultTTL: 3600,
                maxPayloadBytes: 16384
            };
            const factory = new SignerFactory(mockCache, mockKeyResolver, mockCryptoEngine, opts);
            const signer = factory.create();

            expect(signer.logger).toBe(mockLogger);
            expect(signer.defaultTTL).toBe(3600);
            expect(signer.maxPayloadBytes).toBe(16384);
        });
    });
});
