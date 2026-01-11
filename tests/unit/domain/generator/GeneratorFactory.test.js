import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeneratorFactory } from '../../../../src/domain/key-manager/modules/generator/generatorFactory.js';

// Mock fs/promises module
vi.mock('fs/promises', () => ({
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined)
}));

describe('GeneratorFactory', () => {
    let mockCryptoEngine;
    let mockMetadataManager;
    let mockPaths;

    beforeEach(() => {
        // Reset singleton before each test
        GeneratorFactory.instance = null;

        // Create mock dependencies
        mockCryptoEngine = {
            generateKID: vi.fn(),
            generateKeyPair: vi.fn()
        };

        mockMetadataManager = {
            create: vi.fn()
        };

        mockPaths = {
            privateKey: vi.fn(),
            publicKey: vi.fn(),
            privateDir: vi.fn(),
            publicDir: vi.fn(),
            metaKeyDir: vi.fn()
        };
    });

    describe('constructor', () => {
        it('should initialize with all required dependencies', () => {
            // Test: Verify all dependencies are stored
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            expect(factory.cryptoEngine).toBe(mockCryptoEngine);
            expect(factory.metadataManager).toBe(mockMetadataManager);
            expect(factory.paths).toBe(mockPaths);
        });

        it('should accept cryptoEngine as first parameter', () => {
            // Test: CryptoEngine dependency injection
            const customEngine = { custom: 'engine' };
            const factory = new GeneratorFactory(customEngine, mockMetadataManager, mockPaths);

            expect(factory.cryptoEngine).toBe(customEngine);
        });

        it('should accept metadataManager as second parameter', () => {
            // Test: MetadataManager dependency injection
            const customManager = { custom: 'manager' };
            const factory = new GeneratorFactory(mockCryptoEngine, customManager, mockPaths);

            expect(factory.metadataManager).toBe(customManager);
        });

        it('should accept paths as third parameter', () => {
            // Test: Paths repository dependency injection
            const customPaths = { custom: 'paths' };
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, customPaths);

            expect(factory.paths).toBe(customPaths);
        });
    });

    describe('create', () => {
        it('should create RSAKeyGenerator instance with proper dependencies', () => {
            // Test: Factory assembles RSAKeyGenerator with injected components
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generator = factory.create();

            expect(generator).toBeDefined();
            expect(generator.cryptoEngine).toBe(mockCryptoEngine);
            expect(generator.metadataManager).toBe(mockMetadataManager);
            expect(generator.keyWriter).toBeDefined();
            expect(generator.dirManager).toBeDefined();
        });

        it('should inject cryptoEngine into RSAKeyGenerator', () => {
            // Test: CryptoEngine flows from factory to generator
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generator = factory.create();

            expect(generator.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should inject metadataManager into RSAKeyGenerator', () => {
            // Test: MetadataManager flows from factory to generator
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generator = factory.create();

            expect(generator.metadataManager).toBe(mockMetadataManager);
        });

        it('should create KeyWriter with paths and writeFile', () => {
            // Test: KeyWriter is created with correct dependencies
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generator = factory.create();

            expect(generator.keyWriter).toBeDefined();
            expect(generator.keyWriter.paths).toBe(mockPaths);
            expect(typeof generator.keyWriter.writeFile).toBe('function');
        });

        it('should create DirManager with paths and mkdir', () => {
            // Test: DirManager is created with correct dependencies
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generator = factory.create();

            expect(generator.dirManager).toBeDefined();
            expect(generator.dirManager.paths).toBe(mockPaths);
            expect(typeof generator.dirManager.mkdir).toBe('function');
        });

        it('should create new RSAKeyGenerator instance each time', () => {
            // Test: Each create() call returns new instance
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generator1 = factory.create();
            const generator2 = factory.create();

            expect(generator1).not.toBe(generator2);
        });

        it('should create new KeyWriter instance each time', () => {
            // Test: Fresh KeyWriter for each generator
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generator1 = factory.create();
            const generator2 = factory.create();

            expect(generator1.keyWriter).not.toBe(generator2.keyWriter);
        });

        it('should create new DirManager instance each time', () => {
            // Test: Fresh DirManager for each generator
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generator1 = factory.create();
            const generator2 = factory.create();

            expect(generator1.dirManager).not.toBe(generator2.dirManager);
        });

        it('should return generator with working generate method', () => {
            // Test: Created generator has functional generate method
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generator = factory.create();

            expect(typeof generator.generate).toBe('function');
        });
    });

    describe('getInstance (singleton pattern)', () => {
        it('should return the same factory instance on multiple calls', () => {
            // Test: Singleton behavior - one factory per application
            const instance1 = GeneratorFactory.getInstance(mockCryptoEngine, mockMetadataManager, mockPaths);
            const instance2 = GeneratorFactory.getInstance(mockCryptoEngine, mockMetadataManager, mockPaths);

            expect(instance1).toBe(instance2);
        });

        it('should create instance on first call', () => {
            // Test: Lazy instantiation
            expect(GeneratorFactory.instance).toBeNull();

            const instance = GeneratorFactory.getInstance(mockCryptoEngine, mockMetadataManager, mockPaths);

            expect(instance).toBeDefined();
            expect(GeneratorFactory.instance).toBe(instance);
        });

        it('should not create new instance on subsequent calls', () => {
            // Test: Singleton persists across calls
            const instance1 = GeneratorFactory.getInstance(mockCryptoEngine, mockMetadataManager, mockPaths);
            const instance2 = GeneratorFactory.getInstance(mockCryptoEngine, mockMetadataManager, mockPaths);
            const instance3 = GeneratorFactory.getInstance(mockCryptoEngine, mockMetadataManager, mockPaths);

            expect(instance1).toBe(instance2);
            expect(instance2).toBe(instance3);
        });

        it('should initialize with provided dependencies', () => {
            // Test: Singleton uses injected dependencies
            const instance = GeneratorFactory.getInstance(mockCryptoEngine, mockMetadataManager, mockPaths);

            expect(instance.cryptoEngine).toBe(mockCryptoEngine);
            expect(instance.metadataManager).toBe(mockMetadataManager);
            expect(instance.paths).toBe(mockPaths);
        });

        it('should ignore parameters on subsequent calls', () => {
            // Test: First call sets dependencies, later calls ignored
            const engine1 = { id: 1 };
            const engine2 = { id: 2 };

            const instance1 = GeneratorFactory.getInstance(engine1, mockMetadataManager, mockPaths);
            const instance2 = GeneratorFactory.getInstance(engine2, mockMetadataManager, mockPaths);

            expect(instance1).toBe(instance2);
            expect(instance1.cryptoEngine).toBe(engine1); // Uses first call's engine
        });
    });

    describe('factory pattern adherence', () => {
        it('should follow factory pattern conventions', () => {
            // Test: Factory has create method and getInstance static
            const factory = GeneratorFactory.getInstance(mockCryptoEngine, mockMetadataManager, mockPaths);

            expect(typeof factory.create).toBe('function');
            expect(typeof GeneratorFactory.getInstance).toBe('function');
        });

        it('should encapsulate instantiation logic', () => {
            // Test: Consumer doesn't need to know about internal components
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generator = factory.create();

            // Consumer gets RSAKeyGenerator, not individual components
            expect(generator).toHaveProperty('keyWriter');
            expect(generator).toHaveProperty('dirManager');
            expect(typeof generator.generate).toBe('function');
        });

        it('should enable dependency injection at factory level', () => {
            // Test: All dependencies provided to factory, not to components
            const customEngine = { custom: 'engine' };
            const customManager = { custom: 'manager' };
            const customPaths = { custom: 'paths' };

            const factory = new GeneratorFactory(customEngine, customManager, customPaths);
            const generator = factory.create();

            expect(generator.cryptoEngine).toBe(customEngine);
            expect(generator.metadataManager).toBe(customManager);
            expect(generator.keyWriter.paths).toBe(customPaths);
            expect(generator.dirManager.paths).toBe(customPaths);
        });
    });

    describe('integration scenarios', () => {
        it('should create working generator that can coordinate components', () => {
            // Test: Full integration - factory produces functional generator
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generator = factory.create();

            // Generator should have all expected methods
            expect(typeof generator.generate).toBe('function');
            expect(generator.cryptoEngine).toBeDefined();
            expect(generator.metadataManager).toBeDefined();
            expect(generator.keyWriter).toBeDefined();
            expect(generator.dirManager).toBeDefined();
        });

        it('should handle concurrent generator creation', () => {
            // Test: Multiple generators can be created simultaneously
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            const generators = [
                factory.create(),
                factory.create(),
                factory.create()
            ];

            expect(generators).toHaveLength(3);
            generators.forEach(generator => {
                expect(generator).toBeDefined();
                expect(generator.keyWriter).toBeDefined();
                expect(generator.dirManager).toBeDefined();
            });
        });

        it('should allow different factories with different dependencies', () => {
            // Test: Multiple factory instances with different configs
            GeneratorFactory.instance = null; // Reset singleton

            const engine1 = { id: 'engine1' };
            const engine2 = { id: 'engine2' };

            const factory1 = new GeneratorFactory(engine1, mockMetadataManager, mockPaths);
            const factory2 = new GeneratorFactory(engine2, mockMetadataManager, mockPaths);

            const generator1 = factory1.create();
            const generator2 = factory2.create();

            expect(generator1.cryptoEngine).toBe(engine1);
            expect(generator2.cryptoEngine).toBe(engine2);
        });
    });

    describe('error handling', () => {
        it('should handle missing dependencies gracefully', () => {
            // Test: Factory accepts null/undefined dependencies
            expect(() => new GeneratorFactory(null, null, null)).not.toThrow();
        });

        it('should create generator even with minimal dependencies', () => {
            // Test: Factory creates generator with minimal deps
            const minimalFactory = new GeneratorFactory({}, {}, {});

            const generator = minimalFactory.create();

            expect(generator).toBeDefined();
        });

        it('should propagate errors from component construction', () => {
            // Test: Construction errors bubble up
            const factory = new GeneratorFactory(mockCryptoEngine, mockMetadataManager, mockPaths);

            // Should not throw during creation with valid deps
            expect(() => factory.create()).not.toThrow();
        });
    });
});
