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

    describe('runCleanup (expired key reaper)', () => {
        it('should delegate to expiredKeyReaper.cleanup', async () => {
            // Test: Facade delegates to reaper
            await janitor.runCleanup();

            expect(mockExpiredKeyReaper.cleanup).toHaveBeenCalledTimes(1);
        });

        it('should return result from expiredKeyReaper', async () => {
            // Test: Returns reaper's response
            mockExpiredKeyReaper.cleanup.mockResolvedValue({ deleted: 5 });

            const result = await janitor.runCleanup();

            expect(result).toEqual({ deleted: 5 });
        });

        it('should propagate errors from expiredKeyReaper', async () => {
            // Test: Reaper errors bubble up
            mockExpiredKeyReaper.cleanup.mockRejectedValue(new Error('Cleanup failed'));

            await expect(janitor.runCleanup())
                .rejects.toThrow('Cleanup failed');
        });

        it('should handle multiple cleanup calls', async () => {
            // Test: Can call cleanup multiple times
            await janitor.runCleanup();
            await janitor.runCleanup();
            await janitor.runCleanup();

            expect(mockExpiredKeyReaper.cleanup).toHaveBeenCalledTimes(3);
        });
    });

    describe('deletePrivate (key file janitor)', () => {
        it('should delegate to fileJanitor.deletePrivate', async () => {
            // Test: Facade delegates to file janitor
            await janitor.deletePrivate('test.local', 'test-kid');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalledWith('test.local', 'test-kid');
        });

        it('should pass domain parameter correctly', async () => {
            // Test: Domain is forwarded
            await janitor.deletePrivate('specificdomain', 'kid');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalledWith('specificdomain', 'kid');
        });

        it('should pass kid parameter correctly', async () => {
            // Test: KID is forwarded
            await janitor.deletePrivate('testdomain', 'specific-kid-789');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalledWith('testdomain', 'specific-kid-789');
        });

        it('should return result from fileJanitor', async () => {
            // Test: Returns janitor's response
            mockFileJanitor.deletePrivate.mockResolvedValue({ deleted: true });

            const result = await janitor.deletePrivate('test.local', 'test-kid');

            expect(result).toEqual({ deleted: true });
        });

        it('should propagate errors from fileJanitor', async () => {
            // Test: File janitor errors bubble up
            mockFileJanitor.deletePrivate.mockRejectedValue(new Error('File locked'));

            await expect(janitor.deletePrivate('test.local', 'test-kid'))
                .rejects.toThrow('File locked');
        });

        it('should handle multiple deletions', async () => {
            // Test: Sequential private key deletions
            await janitor.deletePrivate('domain1.local', 'kid1');
            await janitor.deletePrivate('domain2.local', 'kid2');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalledTimes(2);
        });
    });

    describe('deletePublic (key file janitor)', () => {
        it('should delegate to fileJanitor.deletePublic', async () => {
            // Test: Facade delegates to file janitor
            await janitor.deletePublic('test.local', 'test-kid');

            expect(mockFileJanitor.deletePublic).toHaveBeenCalledWith('test.local', 'test-kid');
        });

        it('should pass domain parameter correctly', async () => {
            // Test: Domain is forwarded
            await janitor.deletePublic('publicdomain', 'kid');

            expect(mockFileJanitor.deletePublic).toHaveBeenCalledWith('publicdomain', 'kid');
        });

        it('should pass kid parameter correctly', () => {
            // Test: KID is forwarded
            janitor.deletePublic('testdomain', 'public-kid-456');

            expect(mockFileJanitor.deletePublic).toHaveBeenCalledWith('testdomain', 'public-kid-456');
        });

        it('should return result from fileJanitor', async () => {
            // Test: Returns janitor's response
            mockFileJanitor.deletePublic.mockResolvedValue({ success: true });

            const result = await janitor.deletePublic('test.local', 'test-kid');

            expect(result).toEqual({ success: true });
        });

        it('should propagate errors from fileJanitor', async () => {
            // Test: File janitor errors bubble up
            mockFileJanitor.deletePublic.mockRejectedValue(new Error('Permission denied'));

            await expect(janitor.deletePublic('test.local', 'test-kid'))
                .rejects.toThrow('Permission denied');
        });

        it('should handle multiple deletions', async () => {
            // Test: Sequential public key deletions
            await janitor.deletePublic('domain1.local', 'kid1');
            await janitor.deletePublic('domain2.local', 'kid2');
            await janitor.deletePublic('domain3.local', 'kid3');

            expect(mockFileJanitor.deletePublic).toHaveBeenCalledTimes(3);
        });
    });

    describe('deleteOriginMetadata (metadata janitor)', () => {
        it('should delegate to metadataJanitor.deleteOrigin', async () => {
            // Test: Facade delegates to metadata janitor
            await janitor.deleteOriginMetadata('test.local', 'test-kid');

            expect(mockMetadataJanitor.deleteOrigin).toHaveBeenCalledWith('test.local', 'test-kid');
        });

        it('should pass domain parameter correctly', async () => {
            // Test: Domain is forwarded
            await janitor.deleteOriginMetadata('origindomain', 'kid');

            expect(mockMetadataJanitor.deleteOrigin).toHaveBeenCalledWith('origindomain', 'kid');
        });

        it('should pass kid parameter correctly', async () => {
            // Test: KID is forwarded
            await janitor.deleteOriginMetadata('testdomain', 'origin-kid-123');

            expect(mockMetadataJanitor.deleteOrigin).toHaveBeenCalledWith('testdomain', 'origin-kid-123');
        });

        it('should return result from metadataJanitor', async () => {
            // Test: Returns janitor's response
            mockMetadataJanitor.deleteOrigin.mockResolvedValue({ deleted: 1 });

            const result = await janitor.deleteOriginMetadata('test.local', 'test-kid');

            expect(result).toEqual({ deleted: 1 });
        });

        it('should propagate errors from metadataJanitor', async () => {
            // Test: Metadata janitor errors bubble up
            mockMetadataJanitor.deleteOrigin.mockRejectedValue(new Error('Database error'));

            await expect(janitor.deleteOriginMetadata('test.local', 'test-kid'))
                .rejects.toThrow('Database error');
        });
    });

    describe('addKeyExpiry (metadata janitor)', () => {
        it('should delegate to metadataJanitor.addExpiry', async () => {
            // Test: Facade delegates to metadata janitor
            await janitor.addKeyExpiry('test.local', 'test-kid');

            expect(mockMetadataJanitor.addExpiry).toHaveBeenCalledWith('test.local', 'test-kid');
        });

        it('should pass domain parameter correctly', async () => {
            // Test: Domain is forwarded
            await janitor.addKeyExpiry('expirydomain', 'kid');

            expect(mockMetadataJanitor.addExpiry).toHaveBeenCalledWith('expirydomain', 'kid');
        });

        it('should pass kid parameter correctly', async () => {
            // Test: KID is forwarded
            await janitor.addKeyExpiry('testdomain', 'expiry-kid-789');

            expect(mockMetadataJanitor.addExpiry).toHaveBeenCalledWith('testdomain', 'expiry-kid-789');
        });

        it('should return result from metadataJanitor', async () => {
            // Test: Returns janitor's response
            mockMetadataJanitor.addExpiry.mockResolvedValue({ added: true, expiresAt: new Date() });

            const result = await janitor.addKeyExpiry('test.local', 'test-kid');

            expect(result).toHaveProperty('added', true);
            expect(result).toHaveProperty('expiresAt');
        });

        it('should propagate errors from metadataJanitor', async () => {
            // Test: Metadata janitor errors bubble up
            mockMetadataJanitor.addExpiry.mockRejectedValue(new Error('Expiry add failed'));

            await expect(janitor.addKeyExpiry('test.local', 'test-kid'))
                .rejects.toThrow('Expiry add failed');
        });

        it('should handle multiple expiry additions', async () => {
            // Test: Sequential expiry additions
            await janitor.addKeyExpiry('domain1.local', 'kid1');
            await janitor.addKeyExpiry('domain2.local', 'kid2');

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

            await janitor.runCleanup();
            await janitor.deletePrivate('testdomain', 'kid');
            await janitor.deletePublic('testdomain', 'kid');
            await janitor.deleteOriginMetadata('testdomain', 'kid');
            await janitor.addKeyExpiry('testdomain', 'kid');
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
            const domain = 'unchanged.local';
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
            expect(typeof janitor.runCleanup).toBe('function');
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

            await janitor.deletePrivate('test.local', 'old-kid');
            await janitor.deletePublic('test.local', 'old-kid');
            await janitor.deleteOriginMetadata('test.local', 'old-kid');
            await janitor.deleteArchivedMetadata('old-kid');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalled();
            expect(mockFileJanitor.deletePublic).toHaveBeenCalled();
            expect(mockMetadataJanitor.deleteOrigin).toHaveBeenCalled();
            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalled();
        });

        it('should handle key rotation cleanup scenario', async () => {
            // Test: Old key archived, new key active

            await janitor.deletePrivate('testdomain', 'old-kid');
            await janitor.addKeyExpiry('testdomain', 'old-kid');

            expect(mockFileJanitor.deletePrivate).toHaveBeenCalled();
            expect(mockMetadataJanitor.addExpiry).toHaveBeenCalled();
        });

        it('should handle scheduled cleanup', async () => {
            // Test: Periodic cleanup job
            await janitor.runCleanup();

            expect(mockExpiredKeyReaper.cleanup).toHaveBeenCalled();
        });

        it('should handle concurrent operations on different keys', async () => {
            // Test: Multiple operations in parallel
            await Promise.all([
                janitor.deletePrivate('domain1.local', 'kid1'),
                janitor.deletePublic('domain2.local', 'kid2'),
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

            await expect(janitor.deletePrivate('testdomain', 'kid'))
                .rejects.toBe(specificError);
        });

        it('should handle errors from all sub-janitors', async () => {
            // Test: Each sub-janitor's errors propagate
            mockExpiredKeyReaper.cleanup.mockRejectedValue(new Error('Reaper error'));
            mockFileJanitor.deletePrivate.mockRejectedValue(new Error('File error'));
            mockMetadataJanitor.deleteOrigin.mockRejectedValue(new Error('Metadata error'));

            await expect(janitor.runCleanup()).rejects.toThrow('Reaper error');
            await expect(janitor.deletePrivate('d.local', 'k')).rejects.toThrow('File error');
            await expect(janitor.deleteOriginMetadata('d.local', 'k')).rejects.toThrow('Metadata error');
        });
    });
});
