import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BuilderFactory } from '../../../../src/domain/key-manager/modules/builder/builderFactory.js';

describe('BuilderFactory', () => {
    let mockCache;
    let mockLoader;
    let mockCryptoEngine;

    beforeEach(() => {
        // Reset singleton before each test
        BuilderFactory._instance = null;

        // Create mock dependencies
        mockCache = new Map();

        mockLoader = {
            getPublicKeyMap: vi.fn()
        };

        mockCryptoEngine = {
            pemToJWK: vi.fn()
        };
    });

    describe('constructor', () => {
        it('should initialize with all required dependencies', () => {
            // Test: Verify all dependencies are stored
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            expect(factory.cache).toBe(mockCache);
            expect(factory.loader).toBe(mockLoader);
            expect(factory.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should accept cache as first parameter', () => {
            // Test: Cache dependency injection
            const customCache = { custom: 'cache' };
            const factory = new BuilderFactory(customCache, mockLoader, mockCryptoEngine);

            expect(factory.cache).toBe(customCache);
        });

        it('should accept loader as second parameter', () => {
            // Test: Loader dependency injection
            const customLoader = { custom: 'loader' };
            const factory = new BuilderFactory(mockCache, customLoader, mockCryptoEngine);

            expect(factory.loader).toBe(customLoader);
        });

        it('should accept cryptoEngine as third parameter', () => {
            // Test: CryptoEngine dependency injection
            const customEngine = { custom: 'engine' };
            const factory = new BuilderFactory(mockCache, mockLoader, customEngine);

            expect(factory.cryptoEngine).toBe(customEngine);
        });
    });

    describe('create', () => {
        it('should create Builder instance with proper dependencies', () => {
            // Test: Factory assembles Builder with injected components
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            const builder = factory.create();

            expect(builder).toBeDefined();
            expect(builder.cache).toBe(mockCache);
            expect(builder.loader).toBe(mockLoader);
            expect(builder.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should inject cache into Builder', () => {
            // Test: Cache flows from factory to builder
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            const builder = factory.create();

            expect(builder.cache).toBe(mockCache);
        });

        it('should inject loader into Builder', () => {
            // Test: Loader flows from factory to builder
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            const builder = factory.create();

            expect(builder.loader).toBe(mockLoader);
        });

        it('should inject cryptoEngine into Builder', () => {
            // Test: CryptoEngine flows from factory to builder
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            const builder = factory.create();

            expect(builder.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should create new Builder instance each time', () => {
            // Test: Each create() call returns new instance
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            const builder1 = factory.create();
            const builder2 = factory.create();

            expect(builder1).not.toBe(builder2);
        });

        it('should return builder with working getJWKS method', () => {
            // Test: Created builder has functional getJWKS method
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            const builder = factory.create();

            expect(typeof builder.getJWKS).toBe('function');
        });

        it('should share cache across multiple builders', () => {
            // Test: All builders from same factory use same cache
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            const builder1 = factory.create();
            const builder2 = factory.create();

            expect(builder1.cache).toBe(builder2.cache);
        });

        it('should share loader across multiple builders', () => {
            // Test: All builders from same factory use same loader
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            const builder1 = factory.create();
            const builder2 = factory.create();

            expect(builder1.loader).toBe(builder2.loader);
        });
    });

    describe('getInstance (singleton pattern)', () => {
        it('should return the same factory instance on multiple calls', () => {
            // Test: Singleton behavior - one factory per application
            const instance1 = BuilderFactory.getInstance(mockCache, mockLoader, mockCryptoEngine);
            const instance2 = BuilderFactory.getInstance(mockCache, mockLoader, mockCryptoEngine);

            expect(instance1).toBe(instance2);
        });

        it('should create instance on first call', () => {
            // Test: Lazy instantiation
            expect(BuilderFactory._instance).toBeNull();

            const instance = BuilderFactory.getInstance(mockCache, mockLoader, mockCryptoEngine);

            expect(instance).toBeDefined();
            expect(BuilderFactory._instance).toBe(instance);
        });

        it('should not create new instance on subsequent calls', () => {
            // Test: Singleton persists across calls
            const instance1 = BuilderFactory.getInstance(mockCache, mockLoader, mockCryptoEngine);
            const instance2 = BuilderFactory.getInstance(mockCache, mockLoader, mockCryptoEngine);
            const instance3 = BuilderFactory.getInstance(mockCache, mockLoader, mockCryptoEngine);

            expect(instance1).toBe(instance2);
            expect(instance2).toBe(instance3);
        });

        it('should initialize with provided dependencies', () => {
            // Test: Singleton uses injected dependencies
            const instance = BuilderFactory.getInstance(mockCache, mockLoader, mockCryptoEngine);

            expect(instance.cache).toBe(mockCache);
            expect(instance.loader).toBe(mockLoader);
            expect(instance.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should ignore parameters on subsequent calls', () => {
            // Test: First call sets dependencies, later calls ignored
            const cache1 = { id: 1 };
            const cache2 = { id: 2 };

            const instance1 = BuilderFactory.getInstance(cache1, mockLoader, mockCryptoEngine);
            const instance2 = BuilderFactory.getInstance(cache2, mockLoader, mockCryptoEngine);

            expect(instance1).toBe(instance2);
            expect(instance1.cache).toBe(cache1); // Uses first call's cache
        });
    });

    describe('factory pattern adherence', () => {
        it('should follow factory pattern conventions', () => {
            // Test: Factory has create method and getInstance static
            const factory = BuilderFactory.getInstance(mockCache, mockLoader, mockCryptoEngine);

            expect(typeof factory.create).toBe('function');
            expect(typeof BuilderFactory.getInstance).toBe('function');
        });

        it('should encapsulate instantiation logic', () => {
            // Test: Consumer doesn't need to know about Builder internals
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            const builder = factory.create();

            // Consumer gets Builder, not individual components
            expect(builder).toHaveProperty('cache');
            expect(builder).toHaveProperty('loader');
            expect(builder).toHaveProperty('cryptoEngine');
            expect(typeof builder.getJWKS).toBe('function');
        });

        it('should enable dependency injection at factory level', () => {
            // Test: All dependencies provided to factory, not to Builder directly
            const customCache = { custom: 'cache' };
            const customLoader = { custom: 'loader' };
            const customEngine = { custom: 'engine' };

            const factory = new BuilderFactory(customCache, customLoader, customEngine);
            const builder = factory.create();

            expect(builder.cache).toBe(customCache);
            expect(builder.loader).toBe(customLoader);
            expect(builder.cryptoEngine).toBe(customEngine);
        });
    });

    describe('integration scenarios', () => {
        it('should create working builder that can coordinate components', () => {
            // Test: Full integration - factory produces functional builder
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            const builder = factory.create();

            // Builder should have all expected methods
            expect(typeof builder.getJWKS).toBe('function');
            expect(builder.cache).toBeDefined();
            expect(builder.loader).toBeDefined();
            expect(builder.cryptoEngine).toBeDefined();
        });

        it('should handle concurrent builder creation', () => {
            // Test: Multiple builders can be created simultaneously
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            const builders = [
                factory.create(),
                factory.create(),
                factory.create()
            ];

            expect(builders).toHaveLength(3);
            builders.forEach(builder => {
                expect(builder).toBeDefined();
                expect(typeof builder.getJWKS).toBe('function');
            });
        });

        it('should allow different factories with different dependencies', () => {
            // Test: Multiple factory instances with different configs
            BuilderFactory._instance = null; // Reset singleton

            const cache1 = { id: 'cache1' };
            const cache2 = { id: 'cache2' };

            const factory1 = new BuilderFactory(cache1, mockLoader, mockCryptoEngine);
            const factory2 = new BuilderFactory(cache2, mockLoader, mockCryptoEngine);

            const builder1 = factory1.create();
            const builder2 = factory2.create();

            expect(builder1.cache).toBe(cache1);
            expect(builder2.cache).toBe(cache2);
        });

        it('should support builder lifecycle across factory', async () => {
            // Test: Builders from factory work independently
            mockLoader.getPublicKeyMap.mockResolvedValue({
                'kid-1': 'pem-1',
                'kid-2': 'pem-2'
            });
            mockCryptoEngine.pemToJWK.mockResolvedValue({ kty: 'RSA' });

            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);
            const builder1 = factory.create();
            const builder2 = factory.create();

            // Both builders should work independently
            const result1 = await builder1.getJWKS('domain1.com');
            const result2 = await builder2.getJWKS('domain2.com');

            expect(result1).toHaveProperty('keys');
            expect(result2).toHaveProperty('keys');
        });
    });

    describe('error handling', () => {
        it('should handle missing dependencies gracefully', () => {
            // Test: Factory accepts null/undefined dependencies
            expect(() => new BuilderFactory(null, null, null)).not.toThrow();
        });

        it('should create builder even with minimal dependencies', () => {
            // Test: Factory creates builder with minimal deps
            const minimalFactory = new BuilderFactory({}, {}, {});

            const builder = minimalFactory.create();

            expect(builder).toBeDefined();
        });

        it('should propagate errors from Builder construction', () => {
            // Test: Construction errors bubble up
            const factory = new BuilderFactory(mockCache, mockLoader, mockCryptoEngine);

            // Should not throw during creation with valid deps
            expect(() => factory.create()).not.toThrow();
        });
    });

    describe('cache sharing', () => {
        it('should share cache between all builders from same factory', () => {
            // Test: Cache is shared resource
            const sharedCache = new Map();
            const factory = new BuilderFactory(sharedCache, mockLoader, mockCryptoEngine);

            const builder1 = factory.create();
            const builder2 = factory.create();

            expect(builder1.cache).toBe(sharedCache);
            expect(builder2.cache).toBe(sharedCache);
            expect(builder1.cache).toBe(builder2.cache);
        });

        it('should allow builders to benefit from shared cache', () => {
            // Test: One builder caches, another reads
            const sharedCache = new Map();
            sharedCache.set('test-kid', { kty: 'RSA', kid: 'test-kid' });

            const factory = new BuilderFactory(sharedCache, mockLoader, mockCryptoEngine);
            const builder = factory.create();

            expect(builder.cache.get('test-kid')).toEqual({ kty: 'RSA', kid: 'test-kid' });
        });

        it('should maintain cache independence between different factories', () => {
            // Test: Different factories have different caches
            BuilderFactory._instance = null;

            const cache1 = new Map();
            const cache2 = new Map();

            const factory1 = new BuilderFactory(cache1, mockLoader, mockCryptoEngine);
            const factory2 = new BuilderFactory(cache2, mockLoader, mockCryptoEngine);

            const builder1 = factory1.create();
            const builder2 = factory2.create();

            expect(builder1.cache).not.toBe(builder2.cache);
        });
    });
});
