import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JanitorFactory } from '../../../../src/domain/key-manager/modules/Janitor/janitorFactory.js';

describe('JanitorFactory', () => {
    let mockLoaderCache;
    let mockBuilderCache;
    let mockSignerCache;
    let mockMetadataManager;
    let mockPathsRepo;

    beforeEach(() => {
        // Reset singleton
        JanitorFactory.instance = null;

        // Create mock dependencies
        mockLoaderCache = {
            private: { delete: vi.fn() },
            public: { delete: vi.fn() }
        };

        mockBuilderCache = {
            delete: vi.fn()
        };

        mockSignerCache = {
            delete: vi.fn()
        };

        mockMetadataManager = {
            deleteOrigin: vi.fn(),
            deleteArchived: vi.fn(),
            addExpiry: vi.fn(),
            getExpiredMetadata: vi.fn()
        };

        mockPathsRepo = {
            privateKey: vi.fn(),
            publicKey: vi.fn()
        };
    });

    describe('constructor', () => {
        it('should initialize with all cache dependencies', () => {
            // Test: Caches are stored as object
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            expect(factory.loaderCache).toBe(mockLoaderCache);
            expect(factory.builderCache).toBe(mockBuilderCache);
            expect(factory.signerCache).toBe(mockSignerCache);
        });

        it('should initialize with metadataManager', () => {
            // Test: MetadataManager dependency is stored
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            expect(factory.metadataManager).toBe(mockMetadataManager);
        });

        it('should initialize with pathService', () => {
            // Test: PathsRepo dependency is stored
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            expect(factory.pathService).toBe(mockPathsRepo);
        });

        it('should accept caches as destructured object', () => {
            // Test: Cache dependencies passed as object
            const caches = {
                loaderCache: mockLoaderCache,
                builderCache: mockBuilderCache,
                signerCache: mockSignerCache
            };
            const factory = new JanitorFactory(caches, mockMetadataManager, mockPathsRepo);

            expect(factory.loaderCache).toBe(mockLoaderCache);
            expect(factory.builderCache).toBe(mockBuilderCache);
            expect(factory.signerCache).toBe(mockSignerCache);
        });

        it('should accept metadataManager as second parameter', () => {
            // Test: Metadata manager dependency injection
            const customManager = { custom: 'manager' };
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                customManager,
                mockPathsRepo
            );

            expect(factory.metadataManager).toBe(customManager);
        });

        it('should accept pathService as third parameter', () => {
            // Test: Paths repo dependency injection
            const customPaths = { custom: 'paths' };
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                customPaths
            );

            expect(factory.pathService).toBe(customPaths);
        });
    });

    describe('create', () => {
        it('should create Janitor instance with all components', () => {
            // Test: Factory assembles complete Janitor
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor = factory.create();

            expect(janitor).toBeDefined();
            expect(janitor.fileJanitor).toBeDefined();
            expect(janitor.metadataJanitor).toBeDefined();
            expect(janitor.expiredKeyReaper).toBeDefined();
        });

        it('should create KeyDeleter with pathService', () => {
            // Test: KeyDeleter receives paths dependency
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor = factory.create();

            // KeyDeleter is internal to KeyFileJanitor
            expect(janitor.fileJanitor.KeyDeleter).toBeDefined();
            expect(janitor.fileJanitor.KeyDeleter.paths).toBe(mockPathsRepo);
        });

        it('should create KeyFileJanitor with caches and KeyDeleter', () => {
            // Test: KeyFileJanitor receives all cache dependencies
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor = factory.create();

            expect(janitor.fileJanitor.loaderCache).toBe(mockLoaderCache);
            expect(janitor.fileJanitor.builderCache).toBe(mockBuilderCache);
            expect(janitor.fileJanitor.signerCache).toBe(mockSignerCache);
            expect(janitor.fileJanitor.KeyDeleter).toBeDefined();
        });

        it('should create MetadataJanitor with metadataManager', () => {
            // Test: MetadataJanitor receives metadata manager
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor = factory.create();

            expect(janitor.metadataJanitor.metadataManager).toBe(mockMetadataManager);
        });

        it('should create ExpiredKeyReaper with fileJanitor and metadataJanitor', () => {
            // Test: ExpiredKeyReaper receives both janitors
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor = factory.create();

            expect(janitor.expiredKeyReaper.fileJanitor).toBe(janitor.fileJanitor);
            expect(janitor.expiredKeyReaper.metadataJanitor).toBe(janitor.metadataJanitor);
        });

        it('should create new Janitor instance each time', () => {
            // Test: Each create() call returns new instance
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor1 = factory.create();
            const janitor2 = factory.create();

            expect(janitor1).not.toBe(janitor2);
        });

        it('should create working janitor with all methods', () => {
            // Test: Created janitor has complete interface
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor = factory.create();

            expect(typeof janitor.cleanDomain).toBe('function');
            expect(typeof janitor.deletePrivate).toBe('function');
            expect(typeof janitor.deletePublic).toBe('function');
            expect(typeof janitor.deleteOriginMetadata).toBe('function');
            expect(typeof janitor.addKeyExpiry).toBe('function');
            expect(typeof janitor.deleteArchivedMetadata).toBe('function');
        });

        it('should share cache references across multiple janitors', () => {
            // Test: All janitors from same factory use same caches
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor1 = factory.create();
            const janitor2 = factory.create();

            expect(janitor1.fileJanitor.loaderCache).toBe(janitor2.fileJanitor.loaderCache);
            expect(janitor1.fileJanitor.builderCache).toBe(janitor2.fileJanitor.builderCache);
        });
    });

    describe('getInstance (singleton pattern)', () => {
        it('should return the same factory instance on multiple calls', () => {
            // Test: Singleton behavior
            const caches = { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache };
            const instance1 = JanitorFactory.getInstance(
                caches,
                mockMetadataManager,
                mockPathsRepo
            );
            const instance2 = JanitorFactory.getInstance(
                caches,
                mockMetadataManager,
                mockPathsRepo
            );

            expect(instance1).toBe(instance2);
        });

        it('should create instance on first call', () => {
            // Test: Lazy instantiation
            expect(JanitorFactory.instance).toBeNull();

            const caches = { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache };
            const instance = JanitorFactory.getInstance(
                caches,
                mockMetadataManager,
                mockPathsRepo
            );

            expect(instance).toBeDefined();
            expect(JanitorFactory.instance).toBe(instance);
        });

        it('should not create new instance on subsequent calls', () => {
            // Test: Singleton persists
            const caches = { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache };
            const instance1 = JanitorFactory.getInstance(
                caches,
                mockMetadataManager,
                mockPathsRepo
            );
            const instance2 = JanitorFactory.getInstance(
                caches,
                mockMetadataManager,
                mockPathsRepo
            );
            const instance3 = JanitorFactory.getInstance(
                caches,
                mockMetadataManager,
                mockPathsRepo
            );

            expect(instance1).toBe(instance2);
            expect(instance2).toBe(instance3);
        });

        it('should ignore parameters on subsequent calls', () => {
            // Test: First call sets dependencies, later calls ignored
            const cache1 = { loaderCache: { id: 1 }, builderCache: mockBuilderCache, signerCache: mockSignerCache };
            const cache2 = { loaderCache: { id: 2 }, builderCache: mockBuilderCache, signerCache: mockSignerCache };

            const instance1 = JanitorFactory.getInstance(cache1, mockMetadataManager, mockPathsRepo);
            const instance2 = JanitorFactory.getInstance(cache2, mockMetadataManager, mockPathsRepo);

            expect(instance1).toBe(instance2);
            expect(instance1.loaderCache).toBe(cache1.loaderCache); // Uses first call's cache
        });

        it('should initialize with provided dependencies', () => {
            // Test: Singleton uses injected dependencies
            const caches = { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache };
            const instance = JanitorFactory.getInstance(
                caches,
                mockMetadataManager,
                mockPathsRepo
            );

            expect(instance.loaderCache).toBe(mockLoaderCache);
            expect(instance.builderCache).toBe(mockBuilderCache);
            expect(instance.metadataManager).toBe(mockMetadataManager);
            expect(instance.pathService).toBe(mockPathsRepo);
        });
    });

    describe('factory pattern adherence', () => {
        it('should follow factory pattern conventions', () => {
            // Test: Factory has create method and getInstance static
            const factory = JanitorFactory.getInstance(
                mockLoaderCache,
                mockBuilderCache,
                mockMetadataManager,
                mockPathsRepo
            );

            expect(typeof factory.create).toBe('function');
            expect(typeof JanitorFactory.getInstance).toBe('function');
        });

        it('should encapsulate instantiation logic', () => {
            // Test: Consumer doesn't need to know about internal components
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor = factory.create();

            // Consumer gets Janitor, not individual components
            expect(janitor).toHaveProperty('fileJanitor');
            expect(janitor).toHaveProperty('metadataJanitor');
            expect(janitor).toHaveProperty('expiredKeyReaper');
        });

        it('should enable dependency injection at factory level', () => {
            // Test: All dependencies provided to factory, not to components directly
            const customCaches = {
                loaderCache: { custom: 'loader' },
                builderCache: { custom: 'builder' },
                signerCache: { custom: 'signer' }
            };
            const customManager = { custom: 'manager' };
            const customPaths = { custom: 'paths' };

            const factory = new JanitorFactory(customCaches, customManager, customPaths);
            const janitor = factory.create();

            expect(janitor.fileJanitor.loaderCache).toBe(customCaches.loaderCache);
            expect(janitor.metadataJanitor.metadataManager).toBe(customManager);
            expect(janitor.fileJanitor.KeyDeleter.paths).toBe(customPaths);
        });
    });

    describe('integration scenarios', () => {
        it('should create working janitor that can perform all operations', async () => {
            // Test: Full integration - factory produces functional janitor
            mockMetadataManager.addExpiry.mockResolvedValue(true);

            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor = factory.create();

            await janitor.addKeyExpiry('example.com', 'test-kid');

            expect(mockMetadataManager.addExpiry).toHaveBeenCalled();
        });

        it('should handle concurrent janitor creation', () => {
            // Test: Multiple janitors can be created simultaneously
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitors = [
                factory.create(),
                factory.create(),
                factory.create()
            ];

            expect(janitors).toHaveLength(3);
            janitors.forEach(janitor => {
                expect(janitor).toBeDefined();
                expect(typeof janitor.cleanDomain).toBe('function');
            });
        });

        it('should allow different factories with different dependencies', () => {
            // Test: Multiple factory instances with different configs
            JanitorFactory.instance = null;

            const cache1 = { id: 'cache1' };
            const cache2 = { id: 'cache2' };

            const factory1 = new JanitorFactory(
                { loaderCache: cache1, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );
            const factory2 = new JanitorFactory(
                { loaderCache: cache2, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor1 = factory1.create();
            const janitor2 = factory2.create();

            expect(janitor1.fileJanitor.loaderCache).toBe(cache1);
            expect(janitor2.fileJanitor.loaderCache).toBe(cache2);
        });
    });

    describe('dependency composition', () => {
        it('should compose KeyDeleter → KeyFileJanitor → Janitor', () => {
            // Test: Dependency chain is properly composed
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor = factory.create();

            // KeyDeleter is inside KeyFileJanitor
            expect(janitor.fileJanitor.KeyDeleter.paths).toBe(mockPathsRepo);
            // KeyFileJanitor is inside Janitor
            expect(janitor.fileJanitor).toBeDefined();
        });

        it('should compose MetadataJanitor → Janitor', () => {
            // Test: Metadata janitor composition
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor = factory.create();

            expect(janitor.metadataJanitor.metadataManager).toBe(mockMetadataManager);
        });

        it('should compose FileJanitor + MetadataJanitor → ExpiredKeyReaper → Janitor', () => {
            // Test: Complex dependency graph
            const factory = new JanitorFactory(
                { loaderCache: mockLoaderCache, builderCache: mockBuilderCache, signerCache: mockSignerCache },
                mockMetadataManager,
                mockPathsRepo
            );

            const janitor = factory.create();

            expect(janitor.expiredKeyReaper.fileJanitor).toBe(janitor.fileJanitor);
            expect(janitor.expiredKeyReaper.metadataJanitor).toBe(janitor.metadataJanitor);
        });
    });

    describe('error handling', () => {
        it('should handle missing dependencies gracefully', () => {
            // Test: Factory accepts null/undefined dependencies
            expect(() => new JanitorFactory({}, null, null)).not.toThrow();
        });

        it('should create janitor even with minimal dependencies', () => {
            // Test: Factory creates janitor with minimal deps
            const minimalFactory = new JanitorFactory({}, {}, {});

            const janitor = minimalFactory.create();

            expect(janitor).toBeDefined();
        });
    });
});
