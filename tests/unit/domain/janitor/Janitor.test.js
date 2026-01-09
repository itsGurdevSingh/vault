import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Janitor } from '../../../../src/domain/key-manager/modules/Janitor/janitor.js';

describe('Janitor', () => {
    let janitor;
    let mockFileJanitor;
    let mockMetadataJanitor;
    let mockExpiredKeyReaper;

    beforeEach(() => {
        // Create mock dependencies
        mockFileJanitor = {
            deletePrivate: vi.fn().mockResolvedValue(undefined),
            deletePublic: vi.fn().mockResolvedValue(undefined)
        };

        mockMetadataJanitor = {
            deleteOrigin: vi.fn().mockResolvedValue(undefined),
            addExpiry: vi.fn().mockResolvedValue(undefined),
            deleteArchived: vi.fn().mockResolvedValue(undefined)
        };

        mockExpiredKeyReaper = {
            cleanup: vi.fn().mockResolvedValue(undefined)
        };

        janitor = new Janitor(mockFileJanitor, mockMetadataJanitor, mockExpiredKeyReaper);
    });

    describe('constructor', () => {
        it('should initialize with all dependencies', () => {
            // Test: All three janitor components are stored
            expect(janitor.fileJanitor).toBe(mockFileJanitor);
            expect(janitor.metadataJanitor).toBe(mockMetadataJanitor);
            expect(janitor.expiredKeyReaper).toBe(mockExpiredKeyReaper);
        });

        it('should accept fileJanitor as first parameter', () => {
            // Test: File janitor dependency injection
            const customFileJanitor = { custom: 'file' };
            const j = new Janitor(customFileJanitor, mockMetadataJanitor, mockExpiredKeyReaper);

            expect(j.fileJanitor).toBe(customFileJanitor);
        });

        it('should accept metadataJanitor as second parameter', () => {
            // Test: Metadata janitor dependency injection
            const customMetadataJanitor = { custom: 'metadata' };
            const j = new Janitor(mockFileJanitor, customMetadataJanitor, mockExpiredKeyReaper);

            expect(j.metadataJanitor).toBe(customMetadataJanitor);
        });

        it('should accept expiredKeyReaper as third parameter', () => {
            // Test: Expired key reaper dependency injection
            const customReaper = { custom: 'reaper' };
            const j = new Janitor(mockFileJanitor, mockMetadataJanitor, customReaper);

            expect(j.expiredKeyReaper).toBe(customReaper);
        });
    });

    describe('cleanDomain (expired key reaper)', () => {
        it('should delegate to expiredKeyReaper.cleanup', async () => {
            // Test: Facade delegates to reaper
            await janitor.cleanDomain();

            expect(mockExpiredKeyReaper.cleanup).toHaveBeenCalledTimes(1);
        });

        it('should return result from expiredKeyReaper', async () => {
            // Test: Returns reaper's response
            mockExpiredKeyReaper.cleanup.mockResolvedValue({ deleted: 5 });

            const result = await janitor.cleanDomain();

            expect(result).toEqual({ deleted: 5 });
        });

        it('should propagate errors from expiredKeyReaper', async () => {
            // Test: Reaper errors bubble up
            mockExpiredKeyReaper.cleanup.mockRejectedValue(new Error('Cleanup failed'));

            await expect(janitor.cleanDomain())
                .rejects.toThrow('Cleanup failed');
        });

        it('should handle multiple cleanup calls', async () => {
            // Test: Can call cleanup multiple times
            await janitor.cleanDomain();
            await janitor.cleanDomain();
            await janitor.cleanDomain();

            expect(mockExpiredKeyReaper.cleanup).toHaveBeenCalledTimes(3);
        });
    });

    describe('deletePrivate (key file janitor)', () => {
        it('should delegate to fileJanitor.deletePrivate', async () => {
            // Test: Facade delegates to file janitor
            await janitor.deletePrivate('example.com', 'test-kid');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalledWith('example.com', 'test-kid');
        });

        it('should pass domain parameter correctly', async () => {
            // Test: Domain is forwarded
            await janitor.deletePrivate('specific-domain.com', 'kid');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalledWith('specific-domain.com', 'kid');
        });

        it('should pass kid parameter correctly', async () => {
            // Test: KID is forwarded
            await janitor.deletePrivate('domain.com', 'specific-kid-789');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalledWith('domain.com', 'specific-kid-789');
        });

        it('should return result from fileJanitor', async () => {
            // Test: Returns janitor's response
            mockFileJanitor.deletePrivate.mockResolvedValue({ deleted: true });

            const result = await janitor.deletePrivate('example.com', 'test-kid');

            expect(result).toEqual({ deleted: true });
        });

        it('should propagate errors from fileJanitor', async () => {
            // Test: File janitor errors bubble up
            mockFileJanitor.deletePrivate.mockRejectedValue(new Error('File locked'));

            await expect(janitor.deletePrivate('example.com', 'test-kid'))
                .rejects.toThrow('File locked');
        });

        it('should handle multiple deletions', async () => {
            // Test: Sequential private key deletions
            await janitor.deletePrivate('domain1.com', 'kid1');
            await janitor.deletePrivate('domain2.com', 'kid2');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalledTimes(2);
        });
    });

    describe('deletePublic (key file janitor)', () => {
        it('should delegate to fileJanitor.deletePublic', async () => {
            // Test: Facade delegates to file janitor
            await janitor.deletePublic('example.com', 'test-kid');

            expect(mockFileJanitor.deletePublic).toHaveBeenCalledWith('example.com', 'test-kid');
        });

        it('should pass domain parameter correctly', async () => {
            // Test: Domain is forwarded
            await janitor.deletePublic('public-domain.com', 'kid');

            expect(mockFileJanitor.deletePublic).toHaveBeenCalledWith('public-domain.com', 'kid');
        });

        it('should pass kid parameter correctly', () => {
            // Test: KID is forwarded
            janitor.deletePublic('domain.com', 'public-kid-456');

            expect(mockFileJanitor.deletePublic).toHaveBeenCalledWith('domain.com', 'public-kid-456');
        });

        it('should return result from fileJanitor', async () => {
            // Test: Returns janitor's response
            mockFileJanitor.deletePublic.mockResolvedValue({ success: true });

            const result = await janitor.deletePublic('example.com', 'test-kid');

            expect(result).toEqual({ success: true });
        });

        it('should propagate errors from fileJanitor', async () => {
            // Test: File janitor errors bubble up
            mockFileJanitor.deletePublic.mockRejectedValue(new Error('Permission denied'));

            await expect(janitor.deletePublic('example.com', 'test-kid'))
                .rejects.toThrow('Permission denied');
        });

        it('should handle multiple deletions', async () => {
            // Test: Sequential public key deletions
            await janitor.deletePublic('domain1.com', 'kid1');
            await janitor.deletePublic('domain2.com', 'kid2');
            await janitor.deletePublic('domain3.com', 'kid3');

            expect(mockFileJanitor.deletePublic).toHaveBeenCalledTimes(3);
        });
    });

    describe('deleteOriginMetadata (metadata janitor)', () => {
        it('should delegate to metadataJanitor.deleteOrigin', async () => {
            // Test: Facade delegates to metadata janitor
            await janitor.deleteOriginMetadata('example.com', 'test-kid');

            expect(mockMetadataJanitor.deleteOrigin).toHaveBeenCalledWith('example.com', 'test-kid');
        });

        it('should pass domain parameter correctly', async () => {
            // Test: Domain is forwarded
            await janitor.deleteOriginMetadata('origin-domain.com', 'kid');

            expect(mockMetadataJanitor.deleteOrigin).toHaveBeenCalledWith('origin-domain.com', 'kid');
        });

        it('should pass kid parameter correctly', async () => {
            // Test: KID is forwarded
            await janitor.deleteOriginMetadata('domain.com', 'origin-kid-123');

            expect(mockMetadataJanitor.deleteOrigin).toHaveBeenCalledWith('domain.com', 'origin-kid-123');
        });

        it('should return result from metadataJanitor', async () => {
            // Test: Returns janitor's response
            mockMetadataJanitor.deleteOrigin.mockResolvedValue({ deleted: 1 });

            const result = await janitor.deleteOriginMetadata('example.com', 'test-kid');

            expect(result).toEqual({ deleted: 1 });
        });

        it('should propagate errors from metadataJanitor', async () => {
            // Test: Metadata janitor errors bubble up
            mockMetadataJanitor.deleteOrigin.mockRejectedValue(new Error('Database error'));

            await expect(janitor.deleteOriginMetadata('example.com', 'test-kid'))
                .rejects.toThrow('Database error');
        });
    });

    describe('addKeyExpiry (metadata janitor)', () => {
        it('should delegate to metadataJanitor.addExpiry', async () => {
            // Test: Facade delegates to metadata janitor
            await janitor.addKeyExpiry('example.com', 'test-kid');

            expect(mockMetadataJanitor.addExpiry).toHaveBeenCalledWith('example.com', 'test-kid');
        });

        it('should pass domain parameter correctly', async () => {
            // Test: Domain is forwarded
            await janitor.addKeyExpiry('expiry-domain.com', 'kid');

            expect(mockMetadataJanitor.addExpiry).toHaveBeenCalledWith('expiry-domain.com', 'kid');
        });

        it('should pass kid parameter correctly', async () => {
            // Test: KID is forwarded
            await janitor.addKeyExpiry('domain.com', 'expiry-kid-789');

            expect(mockMetadataJanitor.addExpiry).toHaveBeenCalledWith('domain.com', 'expiry-kid-789');
        });

        it('should return result from metadataJanitor', async () => {
            // Test: Returns janitor's response
            mockMetadataJanitor.addExpiry.mockResolvedValue({ added: true, expiresAt: new Date() });

            const result = await janitor.addKeyExpiry('example.com', 'test-kid');

            expect(result).toHaveProperty('added', true);
            expect(result).toHaveProperty('expiresAt');
        });

        it('should propagate errors from metadataJanitor', async () => {
            // Test: Metadata janitor errors bubble up
            mockMetadataJanitor.addExpiry.mockRejectedValue(new Error('Expiry add failed'));

            await expect(janitor.addKeyExpiry('example.com', 'test-kid'))
                .rejects.toThrow('Expiry add failed');
        });

        it('should handle multiple expiry additions', async () => {
            // Test: Sequential expiry additions
            await janitor.addKeyExpiry('domain1.com', 'kid1');
            await janitor.addKeyExpiry('domain2.com', 'kid2');

            expect(mockMetadataJanitor.addExpiry).toHaveBeenCalledTimes(2);
        });
    });

    describe('deleteArchivedMetadata (metadata janitor)', () => {
        it('should delegate to metadataJanitor.deleteArchived', async () => {
            // Test: Facade delegates to metadata janitor
            await janitor.deleteArchivedMetadata('archived-kid');

            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalledWith('archived-kid');
        });

        it('should pass kid parameter correctly', async () => {
            // Test: KID is forwarded
            await janitor.deleteArchivedMetadata('specific-archived-kid-999');

            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalledWith('specific-archived-kid-999');
        });

        it('should return result from metadataJanitor', async () => {
            // Test: Returns janitor's response
            mockMetadataJanitor.deleteArchived.mockResolvedValue({ deleted: true, count: 1 });

            const result = await janitor.deleteArchivedMetadata('test-kid');

            expect(result).toEqual({ deleted: true, count: 1 });
        });

        it('should propagate errors from metadataJanitor', async () => {
            // Test: Metadata janitor errors bubble up
            mockMetadataJanitor.deleteArchived.mockRejectedValue(new Error('Archive not found'));

            await expect(janitor.deleteArchivedMetadata('missing-kid'))
                .rejects.toThrow('Archive not found');
        });

        it('should handle multiple archived deletions', async () => {
            // Test: Sequential archived deletions
            await janitor.deleteArchivedMetadata('kid1');
            await janitor.deleteArchivedMetadata('kid2');
            await janitor.deleteArchivedMetadata('kid3');

            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalledTimes(3);
        });
    });

    describe('facade pattern', () => {
        it('should provide unified interface to three sub-janitors', async () => {
            // Test: Single entry point for all cleanup operations
            await janitor.cleanDomain();
            await janitor.deletePrivate('domain.com', 'kid');
            await janitor.deletePublic('domain.com', 'kid');
            await janitor.deleteOriginMetadata('domain.com', 'kid');
            await janitor.addKeyExpiry('domain.com', 'kid');
            await janitor.deleteArchivedMetadata('kid');

            expect(mockExpiredKeyReaper.cleanup).toHaveBeenCalled();
            expect(mockFileJanitor.deletePrivate).toHaveBeenCalled();
            expect(mockFileJanitor.deletePublic).toHaveBeenCalled();
            expect(mockMetadataJanitor.deleteOrigin).toHaveBeenCalled();
            expect(mockMetadataJanitor.addExpiry).toHaveBeenCalled();
            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalled();
        });

        it('should delegate without modifying parameters', async () => {
            // Test: Pure delegation - no parameter transformation
            const domain = 'unchanged.com';
            const kid = 'unchanged-kid';

            await janitor.deletePrivate(domain, kid);
            await janitor.deletePublic(domain, kid);
            await janitor.deleteOriginMetadata(domain, kid);

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalledWith(domain, kid);
            expect(mockFileJanitor.deletePublic).toHaveBeenCalledWith(domain, kid);
            expect(mockMetadataJanitor.deleteOrigin).toHaveBeenCalledWith(domain, kid);
        });

        it('should isolate consumer from sub-janitor implementations', () => {
            // Test: Consumer only knows about Janitor interface
            expect(typeof janitor.cleanDomain).toBe('function');
            expect(typeof janitor.deletePrivate).toBe('function');
            expect(typeof janitor.deletePublic).toBe('function');
            expect(typeof janitor.deleteOriginMetadata).toBe('function');
            expect(typeof janitor.addKeyExpiry).toBe('function');
            expect(typeof janitor.deleteArchivedMetadata).toBe('function');
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete key lifecycle cleanup', async () => {
            // Test: Full cleanup workflow
            await janitor.deletePrivate('example.com', 'old-kid');
            await janitor.deletePublic('example.com', 'old-kid');
            await janitor.deleteOriginMetadata('example.com', 'old-kid');
            await janitor.deleteArchivedMetadata('old-kid');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalled();
            expect(mockFileJanitor.deletePublic).toHaveBeenCalled();
            expect(mockMetadataJanitor.deleteOrigin).toHaveBeenCalled();
            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalled();
        });

        it('should handle key rotation cleanup scenario', async () => {
            // Test: Old key archived, new key active
            await janitor.deletePrivate('domain.com', 'old-kid');
            await janitor.addKeyExpiry('domain.com', 'old-kid');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalled();
            expect(mockMetadataJanitor.addExpiry).toHaveBeenCalled();
        });

        it('should handle scheduled cleanup', async () => {
            // Test: Periodic cleanup job
            await janitor.cleanDomain();

            expect(mockExpiredKeyReaper.cleanup).toHaveBeenCalled();
        });

        it('should handle concurrent operations on different keys', async () => {
            // Test: Multiple operations in parallel
            await Promise.all([
                janitor.deletePrivate('domain1.com', 'kid1'),
                janitor.deletePublic('domain2.com', 'kid2'),
                janitor.deleteArchivedMetadata('kid3')
            ]);

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalledTimes(1);
            expect(mockFileJanitor.deletePublic).toHaveBeenCalledTimes(1);
            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalledTimes(1);
        });
    });

    describe('error propagation', () => {
        it('should not catch or transform errors', async () => {
            // Test: Errors bubble up unchanged
            const specificError = new Error('Specific janitor error');
            mockFileJanitor.deletePrivate.mockRejectedValue(specificError);

            await expect(janitor.deletePrivate('domain.com', 'kid'))
                .rejects.toBe(specificError);
        });

        it('should handle errors from all sub-janitors', async () => {
            // Test: Each sub-janitor's errors propagate
            mockExpiredKeyReaper.cleanup.mockRejectedValue(new Error('Reaper error'));
            mockFileJanitor.deletePrivate.mockRejectedValue(new Error('File error'));
            mockMetadataJanitor.deleteOrigin.mockRejectedValue(new Error('Metadata error'));

            await expect(janitor.cleanDomain()).rejects.toThrow('Reaper error');
            await expect(janitor.deletePrivate('d.com', 'k')).rejects.toThrow('File error');
            await expect(janitor.deleteOriginMetadata('d.com', 'k')).rejects.toThrow('Metadata error');
        });
    });
});
