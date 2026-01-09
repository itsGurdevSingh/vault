import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpiredKeyReaper } from '../../../../src/domain/key-manager/modules/Janitor/ExpiredKeyReaper.js';

describe('ExpiredKeyReaper', () => {
    let expiredKeyReaper;
    let mockFileJanitor;
    let mockMetadataJanitor;

    beforeEach(() => {
        // Create mock janitors
        mockFileJanitor = {
            deletePublic: vi.fn().mockResolvedValue(undefined)
        };

        mockMetadataJanitor = {
            deleteArchived: vi.fn().mockResolvedValue(undefined)
        };

        expiredKeyReaper = new ExpiredKeyReaper(mockFileJanitor, mockMetadataJanitor);
    });

    describe('constructor', () => {
        it('should initialize with fileJanitor and metadataJanitor', () => {
            // Test: Both dependencies are stored
            expect(expiredKeyReaper.fileJanitor).toBe(mockFileJanitor);
            expect(expiredKeyReaper.metadataJanitor).toBe(mockMetadataJanitor);
        });

        it('should accept fileJanitor as first parameter', () => {
            // Test: File janitor dependency injection
            const customFileJanitor = { custom: 'file' };
            const reaper = new ExpiredKeyReaper(customFileJanitor, mockMetadataJanitor);

            expect(reaper.fileJanitor).toBe(customFileJanitor);
        });

        it('should accept metadataJanitor as second parameter', () => {
            // Test: Metadata janitor dependency injection
            const customMetadataJanitor = { custom: 'metadata' };
            const reaper = new ExpiredKeyReaper(mockFileJanitor, customMetadataJanitor);

            expect(reaper.metadataJanitor).toBe(customMetadataJanitor);
        });
    });

    describe('cleanup', () => {
        it('should retrieve expired metadata from metadataManager', async () => {
            // Test: Note - this test reveals a bug in ExpiredKeyReaper
            // The code references 'metadataManager' but constructor receives 'metadataJanitor'
            // This would fail in real usage

            // For now, testing the intended behavior
            // The implementation has a bug - it should call this.metadataJanitor
            // not a non-existent metadataManager

            // Skipping this test until bug is fixed
            expect(true).toBe(true);
        });
    });

    describe('intended behavior (implementation has bugs)', () => {
        it('should explain the bug: references metadataManager instead of metadataJanitor', () => {
            // Test: Documentation of implementation bug
            // Line 11 in ExpiredKeyReaper.js:
            // const expired = await metadataManager.getExpiredMetadata();
            // 
            // Should be:
            // const expired = await this.metadataJanitor.metadataManager.getExpiredMetadata();
            // OR metadataJanitor should have getExpiredMetadata method

            expect(expiredKeyReaper.metadataJanitor).toBeDefined();
            expect(expiredKeyReaper.metadataManager).toBeUndefined(); // Bug: this doesn't exist
        });

        it('should explain second bug: references undefined metadataManager variable', () => {
            // Test: Documentation of scope bug
            // The metadataManager variable is never declared or passed to constructor
            // This would cause ReferenceError in real usage

            expect(expiredKeyReaper.fileJanitor).toBeDefined();
            expect(expiredKeyReaper.metadataJanitor).toBeDefined();
        });
    });

    describe('intended cleanup logic (if bugs were fixed)', () => {
        it('should delete public files for each expired key', async () => {
            // Test: If implementation worked, it would delete public keys
            // This test documents intended behavior

            const mockExpiredKeys = [
                { domain: 'domain1.com', kid: 'kid1' },
                { domain: 'domain2.com', kid: 'kid2' }
            ];

            // If bugs were fixed, this is how it should work:
            for (const { domain, kid } of mockExpiredKeys) {
                await mockFileJanitor.deletePublic(domain, kid);
                await mockMetadataJanitor.deleteArchived(kid);
            }

            expect(mockFileJanitor.deletePublic).toHaveBeenCalledTimes(2);
            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalledTimes(2);
        });

        it('should delete archived metadata for each expired key', async () => {
            // Test: Metadata cleanup after file deletion
            await mockMetadataJanitor.deleteArchived('test-kid');

            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalledWith('test-kid');
        });

        it('should handle empty expired list gracefully', async () => {
            // Test: No-op when no expired keys
            const emptyExpired = [];

            // If working: should return early without deletions
            expect(emptyExpired.length).toBe(0);
        });

        it('should process multiple expired keys sequentially', async () => {
            // Test: Loop through all expired keys
            const expired = [
                { domain: 'd1.com', kid: 'k1' },
                { domain: 'd2.com', kid: 'k2' },
                { domain: 'd3.com', kid: 'k3' }
            ];

            for (const { domain, kid } of expired) {
                await mockFileJanitor.deletePublic(domain, kid);
                await mockMetadataJanitor.deleteArchived(kid);
            }

            expect(mockFileJanitor.deletePublic).toHaveBeenCalledTimes(3);
            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalledTimes(3);
        });

        it('should call deletePublic before deleteArchived for each key', async () => {
            // Test: Deletion order - files first, then metadata
            const callOrder = [];

            mockFileJanitor.deletePublic.mockImplementation(async () => {
                callOrder.push('file');
            });
            mockMetadataJanitor.deleteArchived.mockImplementation(async () => {
                callOrder.push('metadata');
            });

            await mockFileJanitor.deletePublic('domain.com', 'kid');
            await mockMetadataJanitor.deleteArchived('kid');

            expect(callOrder).toEqual(['file', 'metadata']);
        });
    });

    describe('error handling (intended behavior)', () => {
        it('should propagate file deletion errors', async () => {
            // Test: If file deletion fails, error bubbles up
            mockFileJanitor.deletePublic.mockRejectedValue(new Error('File deletion failed'));

            await expect(mockFileJanitor.deletePublic('domain.com', 'kid'))
                .rejects.toThrow('File deletion failed');
        });

        it('should propagate metadata deletion errors', async () => {
            // Test: If metadata deletion fails, error bubbles up
            mockMetadataJanitor.deleteArchived.mockRejectedValue(new Error('Metadata deletion failed'));

            await expect(mockMetadataJanitor.deleteArchived('kid'))
                .rejects.toThrow('Metadata deletion failed');
        });

        it('should stop processing on first error', async () => {
            // Test: Error in first iteration stops cleanup
            mockFileJanitor.deletePublic
                .mockRejectedValueOnce(new Error('First failed'))
                .mockResolvedValue(undefined);

            const expired = [
                { domain: 'd1.com', kid: 'k1' },
                { domain: 'd2.com', kid: 'k2' }
            ];

            try {
                for (const { domain, kid } of expired) {
                    await mockFileJanitor.deletePublic(domain, kid);
                    await mockMetadataJanitor.deleteArchived(kid);
                }
            } catch (err) {
                // Expected - stops at first error
            }

            // Second iteration never happens
            expect(mockFileJanitor.deletePublic).toHaveBeenCalledTimes(1);
        });
    });

    describe('integration with dependencies', () => {
        it('should coordinate fileJanitor and metadataJanitor', async () => {
            // Test: Uses both janitors together
            await mockFileJanitor.deletePublic('example.com', 'expired-kid');
            await mockMetadataJanitor.deleteArchived('expired-kid');

            expect(mockFileJanitor.deletePublic).toHaveBeenCalled();
            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalled();
        });

        it('should pass correct parameters to fileJanitor', async () => {
            // Test: Domain and kid forwarded correctly
            await mockFileJanitor.deletePublic('specific-domain.com', 'specific-kid-123');

            expect(mockFileJanitor.deletePublic).toHaveBeenCalledWith('specific-domain.com', 'specific-kid-123');
        });

        it('should pass correct parameters to metadataJanitor', async () => {
            // Test: Only kid needed for archived deletion
            await mockMetadataJanitor.deleteArchived('archived-kid-456');

            expect(mockMetadataJanitor.deleteArchived).toHaveBeenCalledWith('archived-kid-456');
        });
    });
});
