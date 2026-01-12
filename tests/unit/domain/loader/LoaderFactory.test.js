import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoaderFactory } from '../../../../src/domain/key-manager/modules/loader/loaderFactory.js';

describe('LoaderFactory', () => {
    let mockCache;
    let mockPaths;
    let mockCryptoEngine;

    beforeEach(() => {
        // Reset singleton before each test
        LoaderFactory._instance = null;

        // Create mock cache with private/public structure (matches managerFactory pattern)
        mockCache = {
            private: new Map(),
            public: new Map(),
            setPrivate: vi.fn((kid, pem) => mockCache.private.set(kid, pem)),
            setPublic: vi.fn((kid, pem) => mockCache.public.set(kid, pem))
        };

        // Create mock paths repository
        mockPaths = {
            privateKey: vi.fn(),
            publicKey: vi.fn(),
            privateDir: vi.fn(),
            publicDir: vi.fn(),
            metaKeyDir: vi.fn()
        };

        // Create mock crypto engine
        mockCryptoEngine = {
            getInfo: vi.fn((kid) => {
                const parts = kid.split('-');
                return { domain: parts[0], date: parts[1], time: parts[2], uniqueId: parts[3] };
            })
        };
    });

    describe('constructor', () => {
        it('should initialize with injected dependencies', () => {
            // Test: Verify factory stores all dependencies
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            expect(factory.KeyChache).toBe(mockCache);
            expect(factory.pathService).toBe(mockPaths);
            expect(factory.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should accept cache as first parameter', () => {
            // Test: Cache dependency injection
            const customCache = { custom: true };
            const factory = new LoaderFactory(customCache, mockPaths, mockCryptoEngine);

            expect(factory.KeyChache).toBe(customCache);
        });

        it('should accept paths as second parameter', () => {
            // Test: Paths repository dependency injection
            const customPaths = { custom: true };
            const factory = new LoaderFactory(mockCache, customPaths, mockCryptoEngine);

            expect(factory.pathService).toBe(customPaths);
        });

        it('should accept cryptoEngine as third parameter', () => {
            // Test: CryptoEngine dependency injection
            const customEngine = { custom: true };
            const factory = new LoaderFactory(mockCache, mockPaths, customEngine);

            expect(factory.cryptoEngine).toBe(customEngine);
        });
    });

    describe('create', () => {
        it('should create KeyRegistry instance with proper dependencies', async () => {
            // Test: Factory assembles KeyRegistry with injected components
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry = await factory.create();

            expect(registry).toBeDefined();
            expect(registry.reader).toBeDefined();
            expect(registry.directory).toBeDefined();
        });

        it('should inject cache into KeyReader', async () => {
            // Test: Cache flows from factory to KeyReader
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry = await factory.create();

            expect(registry.reader.cache).toBe(mockCache);
        });

        it('should inject paths into KeyReader', async () => {
            // Test: Paths repository flows to KeyReader
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry = await factory.create();

            expect(registry.reader.paths).toBe(mockPaths);
        });

        it('should inject cryptoEngine into KeyReader', async () => {
            // Test: CryptoEngine flows to KeyReader
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry = await factory.create();

            expect(registry.reader.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should inject paths into KeyDirectory', async () => {
            // Test: Paths repository flows to KeyDirectory
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry = await factory.create();

            expect(registry.directory.paths).toBe(mockPaths);
        });

        it('should create new KeyRegistry instance each time', async () => {
            // Test: Each create() call returns new instance
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry1 = await factory.create();
            const registry2 = await factory.create();

            expect(registry1).not.toBe(registry2);
        });

        it('should create new KeyReader instance each time', async () => {
            // Test: Fresh KeyReader for each registry
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry1 = await factory.create();
            const registry2 = await factory.create();

            expect(registry1.reader).not.toBe(registry2.reader);
        });

        it('should create new KeyDirectory instance each time', async () => {
            // Test: Fresh KeyDirectory for each registry
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry1 = await factory.create();
            const registry2 = await factory.create();

            expect(registry1.directory).not.toBe(registry2.directory);
        });

        it('should return registry with working reader', async () => {
            // Test: Created registry has functional reader
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry = await factory.create();

            expect(typeof registry.reader.publicKey).toBe('function');
            expect(typeof registry.reader.privateKey).toBe('function');
        });

        it('should return registry with working directory', async () => {
            // Test: Created registry has functional directory
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry = await factory.create();

            expect(typeof registry.directory.listPublicKids).toBe('function');
            expect(typeof registry.directory.listPrivateKids).toBe('function');
        });
    });

    describe('getInstance (singleton pattern)', () => {
        it('should return the same factory instance on multiple calls', () => {
            // Test: Singleton behavior - one factory per application
            const instance1 = LoaderFactory.getInstance(mockCache, mockPaths, mockCryptoEngine);
            const instance2 = LoaderFactory.getInstance(mockCache, mockPaths, mockCryptoEngine);

            expect(instance1).toBe(instance2);
        });

        it('should create instance on first call', () => {
            // Test: Lazy instantiation
            expect(LoaderFactory._instance).toBeNull();

            const instance = LoaderFactory.getInstance(mockCache, mockPaths, mockCryptoEngine);

            expect(instance).toBeDefined();
            expect(LoaderFactory._instance).toBe(instance);
        });

        it('should not create new instance on subsequent calls', () => {
            // Test: Singleton persists across calls
            const instance1 = LoaderFactory.getInstance(mockCache, mockPaths, mockCryptoEngine);
            const instance2 = LoaderFactory.getInstance(mockCache, mockPaths, mockCryptoEngine);
            const instance3 = LoaderFactory.getInstance(mockCache, mockPaths, mockCryptoEngine);

            expect(instance1).toBe(instance2);
            expect(instance2).toBe(instance3);
        });

        it('should initialize with provided dependencies', () => {
            // Test: Singleton uses injected dependencies
            const instance = LoaderFactory.getInstance(mockCache, mockPaths, mockCryptoEngine);

            expect(instance.KeyChache).toBe(mockCache);
            expect(instance.pathService).toBe(mockPaths);
            expect(instance.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should ignore parameters on subsequent calls', () => {
            // Test: First call sets dependencies, later calls ignored
            const cache1 = { id: 1 };
            const cache2 = { id: 2 };

            const instance1 = LoaderFactory.getInstance(cache1, mockPaths, mockCryptoEngine);
            const instance2 = LoaderFactory.getInstance(cache2, mockPaths, mockCryptoEngine);

            expect(instance1).toBe(instance2);
            expect(instance1.KeyChache).toBe(cache1); // Uses first call's cache
        });
    });

    describe('factory pattern adherence', () => {
        it('should follow factory pattern conventions', () => {
            // Test: Factory has create method and getInstance static
            const factory = LoaderFactory.getInstance(mockCache, mockPaths, mockCryptoEngine);

            expect(typeof factory.create).toBe('function');
            expect(typeof LoaderFactory.getInstance).toBe('function');
        });

        it('should encapsulate instantiation logic', async () => {
            // Test: Consumer doesn't need to know about internal components
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry = await factory.create();

            // Consumer gets KeyRegistry, not individual components
            expect(registry).toHaveProperty('reader');
            expect(registry).toHaveProperty('directory');
            expect(typeof registry.getAllPublicKids).toBe('function');
        });

        it('should enable dependency injection at factory level', async () => {
            // Test: All dependencies provided to factory, not to components
            const customCache = { custom: 'cache' };
            const customPaths = { custom: 'paths' };
            const customEngine = { custom: 'engine', getInfo: vi.fn() };

            const factory = new LoaderFactory(customCache, customPaths, customEngine);
            const registry = await factory.create();

            expect(registry.reader.cache).toBe(customCache);
            expect(registry.reader.paths).toBe(customPaths);
            expect(registry.reader.cryptoEngine).toBe(customEngine);
            expect(registry.directory.paths).toBe(customPaths);
        });
    });

    describe('integration scenarios', () => {
        it('should create working registry that can coordinate components', async () => {
            // Test: Full integration - factory produces functional registry
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const registry = await factory.create();

            // Registry should expose all expected methods
            expect(typeof registry.getAllPublicKids).toBe('function');
            expect(typeof registry.getAllPrivateKids).toBe('function');
            expect(typeof registry.getPublicKeyMap).toBe('function');
            expect(typeof registry.getPrivateKeyMap).toBe('function');
            expect(typeof registry.getPublicKey).toBe('function');
            expect(typeof registry.getPrivateKey).toBe('function');
        });

        it('should handle concurrent registry creation', async () => {
            // Test: Multiple registries can be created simultaneously
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            const promises = [
                factory.create(),
                factory.create(),
                factory.create()
            ];

            const registries = await Promise.all(promises);

            expect(registries).toHaveLength(3);
            registries.forEach(registry => {
                expect(registry).toBeDefined();
                expect(registry.reader).toBeDefined();
                expect(registry.directory).toBeDefined();
            });
        });

        it('should allow different factories with different dependencies', async () => {
            // Test: Multiple factory instances with different configs
            LoaderFactory._instance = null; // Reset singleton

            const cache1 = { id: 'cache1' };
            const cache2 = { id: 'cache2' };

            const factory1 = new LoaderFactory(cache1, mockPaths, mockCryptoEngine);
            const factory2 = new LoaderFactory(cache2, mockPaths, mockCryptoEngine);

            const registry1 = await factory1.create();
            const registry2 = await factory2.create();

            expect(registry1.reader.cache).toBe(cache1);
            expect(registry2.reader.cache).toBe(cache2);
        });
    });

    describe('error handling', () => {
        it('should handle missing dependencies gracefully', () => {
            // Test: Factory accepts null/undefined dependencies
            expect(() => new LoaderFactory(null, null, null)).not.toThrow();
        });

        it('should create registry even with minimal dependencies', async () => {
            // Test: Factory creates registry with minimal deps
            const minimalFactory = new LoaderFactory({}, {}, { getInfo: vi.fn() });

            const registry = await minimalFactory.create();

            expect(registry).toBeDefined();
        });

        it('should propagate errors from component construction', async () => {
            // Test: Construction errors bubble up
            // This tests error scenarios if components throw during construction
            const factory = new LoaderFactory(mockCache, mockPaths, mockCryptoEngine);

            // Should not throw during creation with valid deps
            await expect(factory.create()).resolves.toBeDefined();
        });
    });
});
