import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetadataFactory } from '../../../../src/domain/key-manager/modules/metadata/metadataFactory.js';

describe('MetadataFactory', () => {
    let mockPathsRepo;
    let mockFsOps;

    beforeEach(() => {
        MetadataFactory._instance = null;

        mockPathsRepo = {
            metaKeyFile: vi.fn(),
            metaArchivedKeyFile: vi.fn(),
            metaArchivedDir: vi.fn()
        };

        mockFsOps = {
            writeFile: vi.fn(),
            readFile: vi.fn(),
            unlink: vi.fn(),
            readdir: vi.fn(),
            mkdir: vi.fn(),
            path: { join: vi.fn() }
        };
    });

    describe('constructor', () => {
        it('should initialize with pathsRepo and fsOps', () => {
            const factory = new MetadataFactory(mockPathsRepo, mockFsOps);
            expect(factory.pathsRepo).toBe(mockPathsRepo);
            expect(factory.fsOps).toBe(mockFsOps);
        });

        it('should use default fsOps if not provided', () => {
            const factory = new MetadataFactory(mockPathsRepo);
            expect(factory.pathsRepo).toBe(mockPathsRepo);
            expect(factory.fsOps).toBeDefined();
            expect(factory.fsOps.writeFile).toBeDefined();
            expect(factory.fsOps.readFile).toBeDefined();
            expect(factory.fsOps.path).toBeDefined();
        });

        it('should accept custom fsOps parameter', () => {
            const customFs = { custom: 'fs' };
            const factory = new MetadataFactory(mockPathsRepo, customFs);
            expect(factory.fsOps).toBe(customFs);
        });
    });

    describe('create', () => {
        it('should create MetadataService with MetaFileStore', () => {
            const factory = new MetadataFactory(mockPathsRepo, mockFsOps);

            const service = factory.create();

            expect(service).toBeDefined();
            expect(service.store).toBeDefined();
            expect(service.builder).toBeDefined();
        });

        it('should create MetaFileStore with pathsRepo and fsOps', () => {
            const factory = new MetadataFactory(mockPathsRepo, mockFsOps);

            const service = factory.create();

            expect(service.store.paths).toBe(mockPathsRepo);
            expect(service.store.fs).toBe(mockFsOps);
        });

        it('should create new MetadataService instance each time', () => {
            const factory = new MetadataFactory(mockPathsRepo, mockFsOps);

            const service1 = factory.create();
            const service2 = factory.create();

            expect(service1).not.toBe(service2);
        });

        it('should create working MetadataService with all methods', () => {
            const factory = new MetadataFactory(mockPathsRepo, mockFsOps);

            const service = factory.create();

            expect(typeof service.create).toBe('function');
            expect(typeof service.read).toBe('function');
            expect(typeof service.addExpiry).toBe('function');
            expect(typeof service.deleteOrigin).toBe('function');
            expect(typeof service.deleteArchived).toBe('function');
            expect(typeof service.getExpiredMetadata).toBe('function');
        });
    });

    describe('getInstance (singleton)', () => {
        it('should return same instance on multiple calls', () => {
            const instance1 = MetadataFactory.getInstance(mockPathsRepo, mockFsOps);
            const instance2 = MetadataFactory.getInstance(mockPathsRepo, mockFsOps);

            expect(instance1).toBe(instance2);
        });

        it('should create instance on first call', () => {
            expect(MetadataFactory._instance).toBeNull();

            const instance = MetadataFactory.getInstance(mockPathsRepo, mockFsOps);

            expect(instance).toBeDefined();
            expect(MetadataFactory._instance).toBe(instance);
        });

        it('should initialize with pathsRepo and fsOps', () => {
            const instance = MetadataFactory.getInstance(mockPathsRepo, mockFsOps);

            expect(instance.pathsRepo).toBe(mockPathsRepo);
            expect(instance.fsOps).toBe(mockFsOps);
        });

        it('should ignore parameters on subsequent calls', () => {
            const paths1 = { id: 1 };
            const paths2 = { id: 2 };
            const fs1 = { id: 'fs1' };
            const fs2 = { id: 'fs2' };

            const instance1 = MetadataFactory.getInstance(paths1, fs1);
            const instance2 = MetadataFactory.getInstance(paths2, fs2);

            expect(instance1).toBe(instance2);
            expect(instance1.pathsRepo).toBe(paths1);
            expect(instance1.fsOps).toBe(fs1);
        });
    });

    describe('factory pattern', () => {
        it('should follow factory pattern conventions', () => {
            const factory = MetadataFactory.getInstance(mockPathsRepo);

            expect(typeof factory.create).toBe('function');
            expect(typeof MetadataFactory.getInstance).toBe('function');
        });

        it('should encapsulate service creation', () => {
            const factory = new MetadataFactory(mockPathsRepo);

            const service = factory.create();

            expect(service.store).toBeDefined();
            expect(service.builder).toBeDefined();
        });
    });
});
