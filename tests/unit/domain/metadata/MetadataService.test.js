import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetadataService } from '../../../../src/domain/key-manager/modules/metadata/MetadataService.js';

describe('MetadataService', () => {
    let service;
    let mockStore;

    beforeEach(() => {
        mockStore = {
            writeOrigin: vi.fn(),
            readOrigin: vi.fn(),
            deleteOrigin: vi.fn(),
            writeArchive: vi.fn(),
            readArchive: vi.fn(),
            deleteArchive: vi.fn(),
            readAllArchives: vi.fn()
        };

        service = new MetadataService(mockStore);
    });

    describe('constructor', () => {
        it('should initialize with store', () => {
            expect(service.store).toBe(mockStore);
        });

        it('should create MetaBuilder instance', () => {
            expect(service.builder).toBeDefined();
        });
    });

    describe('create', () => {
        it('should create and write metadata', async () => {
            const domain = 'example.com';
            const kid = 'test-kid';
            const createdAt = new Date('2024-01-01');
            mockStore.writeOrigin.mockResolvedValue({ kid, domain });

            const result = await service.create(domain, kid, createdAt);

            expect(mockStore.writeOrigin).toHaveBeenCalledWith(domain, kid, {
                kid,
                domain,
                createdAt: createdAt.toISOString(),
                expiresAt: null
            });
            expect(result).toEqual({ kid, domain });
        });

        it('should default to current date if createdAt not provided', async () => {
            mockStore.writeOrigin.mockResolvedValue({});

            await service.create('domain.com', 'kid');

            const call = mockStore.writeOrigin.mock.calls[0];
            const meta = call[2];
            expect(meta.createdAt).toBeDefined();
        });

        it('should return result from store', async () => {
            const expected = { kid: 'kid', domain: 'domain.com', createdAt: '2024-01-01', expiresAt: null };
            mockStore.writeOrigin.mockResolvedValue(expected);

            const result = await service.create('domain.com', 'kid', new Date());

            expect(result).toBe(expected);
        });
    });

    describe('read', () => {
        it('should read from origin first', async () => {
            const meta = { kid: 'kid', domain: 'domain.com' };
            mockStore.readOrigin.mockResolvedValue(meta);

            const result = await service.read('domain.com', 'kid');

            expect(mockStore.readOrigin).toHaveBeenCalledWith('domain.com', 'kid');
            expect(result).toBe(meta);
        });

        it('should fallback to archive if origin not found', async () => {
            const archivedMeta = { kid: 'kid', expiresAt: '2024-12-31' };
            mockStore.readOrigin.mockResolvedValue(null);
            mockStore.readArchive.mockResolvedValue(archivedMeta);

            const result = await service.read('domain.com', 'kid');

            expect(mockStore.readOrigin).toHaveBeenCalled();
            expect(mockStore.readArchive).toHaveBeenCalledWith('kid');
            expect(result).toBe(archivedMeta);
        });

        it('should not call readArchive if origin exists', async () => {
            mockStore.readOrigin.mockResolvedValue({ kid: 'kid' });

            await service.read('domain.com', 'kid');

            expect(mockStore.readArchive).not.toHaveBeenCalled();
        });

        it('should return null if neither origin nor archive found', async () => {
            mockStore.readOrigin.mockResolvedValue(null);
            mockStore.readArchive.mockResolvedValue(null);

            const result = await service.read('domain.com', 'missing-kid');

            expect(result).toBeNull();
        });
    });

    describe('addExpiry', () => {
        it('should read current metadata, apply expiry, and write to archive', async () => {
            const current = { kid: 'kid', domain: 'domain.com', createdAt: '2024-01-01', expiresAt: null };
            const expiresAt = new Date('2024-12-31');
            mockStore.readOrigin.mockResolvedValue(current);
            mockStore.writeArchive.mockResolvedValue({});

            await service.addExpiry('domain.com', 'kid', expiresAt);

            expect(mockStore.readOrigin).toHaveBeenCalledWith('domain.com', 'kid');
            expect(mockStore.writeArchive).toHaveBeenCalledWith('kid', {
                ...current,
                expiresAt: expiresAt.toISOString()
            });
        });

        it('should return null if metadata not found', async () => {
            mockStore.readOrigin.mockResolvedValue(null);
            mockStore.readArchive.mockResolvedValue(null);

            const result = await service.addExpiry('domain.com', 'missing-kid', new Date());

            expect(result).toBeNull();
            expect(mockStore.writeArchive).not.toHaveBeenCalled();
        });

        it('should work with archived metadata', async () => {
            const archived = { kid: 'kid', domain: 'domain.com', expiresAt: '2024-06-01' };
            const newExpiresAt = new Date('2024-12-31');
            mockStore.readOrigin.mockResolvedValue(null);
            mockStore.readArchive.mockResolvedValue(archived);
            mockStore.writeArchive.mockResolvedValue({});

            await service.addExpiry('domain.com', 'kid', newExpiresAt);

            expect(mockStore.writeArchive).toHaveBeenCalledWith('kid', {
                ...archived,
                expiresAt: newExpiresAt.toISOString()
            });
        });

        it('should return result from writeArchive', async () => {
            const expected = { kid: 'kid', expiresAt: '2024-12-31' };
            mockStore.readOrigin.mockResolvedValue({ kid: 'kid' });
            mockStore.writeArchive.mockResolvedValue(expected);

            const result = await service.addExpiry('domain.com', 'kid', new Date());

            expect(result).toBe(expected);
        });
    });

    describe('deleteOrigin', () => {
        it('should delegate to store.deleteOrigin', async () => {
            mockStore.deleteOrigin.mockResolvedValue(true);

            const result = await service.deleteOrigin('example.com', 'test-kid');

            expect(mockStore.deleteOrigin).toHaveBeenCalledWith('example.com', 'test-kid');
            expect(result).toBe(true);
        });

        it('should pass domain and kid correctly', async () => {
            mockStore.deleteOrigin.mockResolvedValue(undefined);

            await service.deleteOrigin('specific.domain.com', 'specific-kid-123');

            expect(mockStore.deleteOrigin).toHaveBeenCalledWith('specific.domain.com', 'specific-kid-123');
        });
    });

    describe('deleteArchived', () => {
        it('should delegate to store.deleteArchive', async () => {
            mockStore.deleteArchive.mockResolvedValue(true);

            const result = await service.deleteArchived('archived-kid');

            expect(mockStore.deleteArchive).toHaveBeenCalledWith('archived-kid');
            expect(result).toBe(true);
        });

        it('should pass kid correctly', async () => {
            mockStore.deleteArchive.mockResolvedValue(undefined);

            await service.deleteArchived('specific-archived-kid');

            expect(mockStore.deleteArchive).toHaveBeenCalledWith('specific-archived-kid');
        });
    });

    describe('getExpiredMetadata', () => {
        it('should read all archives and filter expired ones', async () => {
            const now = Date.now();
            const archives = [
                { kid: 'kid1', expiresAt: new Date(now - 1000).toISOString() },
                { kid: 'kid2', expiresAt: new Date(now + 1000).toISOString() },
                { kid: 'kid3', expiresAt: new Date(now - 5000).toISOString() },
                { kid: 'kid4', expiresAt: null }
            ];
            mockStore.readAllArchives.mockResolvedValue(archives);

            const result = await service.getExpiredMetadata();

            expect(mockStore.readAllArchives).toHaveBeenCalled();
            expect(result).toHaveLength(2);
            expect(result[0].kid).toBe('kid1');
            expect(result[1].kid).toBe('kid3');
        });

        it('should return empty array if no archives', async () => {
            mockStore.readAllArchives.mockResolvedValue([]);

            const result = await service.getExpiredMetadata();

            expect(result).toEqual([]);
        });

        it('should handle archives without expiresAt', async () => {
            const archives = [
                { kid: 'kid1', expiresAt: null },
                { kid: 'kid2' }
            ];
            mockStore.readAllArchives.mockResolvedValue(archives);

            const result = await service.getExpiredMetadata();

            expect(result).toHaveLength(0);
        });

        it('should only return expired metadata', async () => {
            const futureDate = new Date(Date.now() + 100000).toISOString();
            const archives = [
                { kid: 'future', expiresAt: futureDate }
            ];
            mockStore.readAllArchives.mockResolvedValue(archives);

            const result = await service.getExpiredMetadata();

            expect(result).toHaveLength(0);
        });
    });

    describe('integration', () => {
        it('should support full metadata lifecycle', async () => {
            mockStore.writeOrigin.mockResolvedValue({});
            mockStore.readOrigin.mockResolvedValue({ kid: 'kid', domain: 'domain.com' });
            mockStore.writeArchive.mockResolvedValue({});
            mockStore.deleteOrigin.mockResolvedValue(true);

            await service.create('domain.com', 'kid', new Date());
            await service.addExpiry('domain.com', 'kid', new Date());
            await service.deleteOrigin('domain.com', 'kid');

            expect(mockStore.writeOrigin).toHaveBeenCalled();
            expect(mockStore.writeArchive).toHaveBeenCalled();
            expect(mockStore.deleteOrigin).toHaveBeenCalled();
        });

        it('should handle metadata not found gracefully', async () => {
            mockStore.readOrigin.mockResolvedValue(null);
            mockStore.readArchive.mockResolvedValue(null);

            const result = await service.read('domain.com', 'missing');

            expect(result).toBeNull();
        });
    });
});
