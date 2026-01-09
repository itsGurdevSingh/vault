import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetadataJanitor } from '../../../../src/domain/key-manager/modules/Janitor/MetadataJanitor.js';

describe('MetadataJanitor', () => {
    let metadataJanitor;
    let mockMetadataManager;

    beforeEach(() => {
        // Create mock metadata manager
        mockMetadataManager = {
            deleteOrigin: vi.fn().mockResolvedValue(true),
            deleteArchived: vi.fn().mockResolvedValue(true),
            addExpiry: vi.fn().mockResolvedValue(true)
        };

        metadataJanitor = new MetadataJanitor(mockMetadataManager);
    });

    describe('constructor', () => {
        it('should initialize with metadataManager', () => {
            // Test: MetadataManager dependency is stored
            expect(metadataJanitor.metadataManager).toBe(mockMetadataManager);
        });

        it('should accept metadataManager as parameter', () => {
            // Test: Dependency injection works
            const customManager = { custom: 'manager' };
            const janitor = new MetadataJanitor(customManager);

            expect(janitor.metadataManager).toBe(customManager);
        });
    });

    describe('deleteOrigin', () => {
        it('should delegate to metadataManager.deleteOrigin', async () => {
            // Test: Passes through to manager
            await metadataJanitor.deleteOrigin('example.com', 'test-kid-123');

            expect(mockMetadataManager.deleteOrigin).toHaveBeenCalledWith('example.com', 'test-kid-123');
        });

        it('should return result from metadataManager', async () => {
            // Test: Returns manager's response
            mockMetadataManager.deleteOrigin.mockResolvedValue({ deleted: true });

            const result = await metadataJanitor.deleteOrigin('example.com', 'test-kid');

            expect(result).toEqual({ deleted: true });
        });

        it('should pass domain parameter correctly', async () => {
            // Test: Domain is forwarded
            await metadataJanitor.deleteOrigin('specific-domain.com', 'kid');

            expect(mockMetadataManager.deleteOrigin).toHaveBeenCalledWith('specific-domain.com', 'kid');
        });

        it('should pass kid parameter correctly', async () => {
            // Test: KID is forwarded
            await metadataJanitor.deleteOrigin('domain.com', 'specific-kid-789');

            expect(mockMetadataManager.deleteOrigin).toHaveBeenCalledWith('domain.com', 'specific-kid-789');
        });

        it('should handle errors from metadataManager', async () => {
            // Test: Propagates manager errors
            mockMetadataManager.deleteOrigin.mockRejectedValue(new Error('Database error'));

            await expect(metadataJanitor.deleteOrigin('example.com', 'test-kid'))
                .rejects.toThrow('Database error');
        });

        it('should handle multiple deletions', async () => {
            // Test: Sequential origin deletions
            await metadataJanitor.deleteOrigin('domain1.com', 'kid1');
            await metadataJanitor.deleteOrigin('domain2.com', 'kid2');
            await metadataJanitor.deleteOrigin('domain3.com', 'kid3');

            expect(mockMetadataManager.deleteOrigin).toHaveBeenCalledTimes(3);
        });
    });

    describe('deleteArchived', () => {
        it('should delegate to metadataManager.deleteArchived', async () => {
            // Test: Passes through to manager
            await metadataJanitor.deleteArchived('archived-kid-456');

            expect(mockMetadataManager.deleteArchived).toHaveBeenCalledWith('archived-kid-456');
        });

        it('should return result from metadataManager', async () => {
            // Test: Returns manager's response
            mockMetadataManager.deleteArchived.mockResolvedValue({ success: true, count: 1 });

            const result = await metadataJanitor.deleteArchived('test-kid');

            expect(result).toEqual({ success: true, count: 1 });
        });

        it('should pass kid parameter correctly', async () => {
            // Test: KID is forwarded
            await metadataJanitor.deleteArchived('specific-archived-kid');

            expect(mockMetadataManager.deleteArchived).toHaveBeenCalledWith('specific-archived-kid');
        });

        it('should handle errors from metadataManager', async () => {
            // Test: Propagates manager errors
            mockMetadataManager.deleteArchived.mockRejectedValue(new Error('Archive not found'));

            await expect(metadataJanitor.deleteArchived('missing-kid'))
                .rejects.toThrow('Archive not found');
        });

        it('should handle multiple archived deletions', async () => {
            // Test: Sequential archived deletions
            await metadataJanitor.deleteArchived('kid1');
            await metadataJanitor.deleteArchived('kid2');

            expect(mockMetadataManager.deleteArchived).toHaveBeenCalledTimes(2);
        });

        it('should work without domain parameter', async () => {
            // Test: Only kid needed for archived deletion
            await metadataJanitor.deleteArchived('kid-only');

            expect(mockMetadataManager.deleteArchived).toHaveBeenCalledWith('kid-only');
            expect(mockMetadataManager.deleteArchived).toHaveBeenCalledTimes(1);
        });
    });

    describe('addExpiry', () => {
        it('should delegate to metadataManager.addExpiry with expiration date', async () => {
            // Test: Calculates and passes expiration date
            await metadataJanitor.addExpiry('example.com', 'test-kid');

            expect(mockMetadataManager.addExpiry).toHaveBeenCalled();
            const [domain, kid, expirationDate] = mockMetadataManager.addExpiry.mock.calls[0];
            expect(domain).toBe('example.com');
            expect(kid).toBe('test-kid');
            expect(expirationDate).toBeInstanceOf(Date);
        });

        it('should calculate expiration date with KEY_PUBLIC_TTL_MS + KEY_GRACE_MS', async () => {
            // Test: Expiration is TTL + grace period from now
            const beforeCall = Date.now();
            await metadataJanitor.addExpiry('example.com', 'test-kid');
            const afterCall = Date.now();

            const [, , expirationDate] = mockMetadataManager.addExpiry.mock.calls[0];
            const expirationMs = expirationDate.getTime();

            // Should be future date (TTL + GRACE from now)
            expect(expirationMs).toBeGreaterThan(beforeCall);
        });

        it('should pass domain parameter correctly', async () => {
            // Test: Domain is forwarded
            await metadataJanitor.addExpiry('specific.domain.com', 'kid');

            const [domain] = mockMetadataManager.addExpiry.mock.calls[0];
            expect(domain).toBe('specific.domain.com');
        });

        it('should pass kid parameter correctly', async () => {
            // Test: KID is forwarded
            await metadataJanitor.addExpiry('domain.com', 'specific-kid-999');

            const [, kid] = mockMetadataManager.addExpiry.mock.calls[0];
            expect(kid).toBe('specific-kid-999');
        });

        it('should create new Date object for each call', async () => {
            // Test: Each call gets fresh timestamp
            await metadataJanitor.addExpiry('domain.com', 'kid1');
            await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
            await metadataJanitor.addExpiry('domain.com', 'kid2');

            const [, , date1] = mockMetadataManager.addExpiry.mock.calls[0];
            const [, , date2] = mockMetadataManager.addExpiry.mock.calls[1];

            expect(date2.getTime()).toBeGreaterThanOrEqual(date1.getTime());
        });

        it('should return result from metadataManager', async () => {
            // Test: Returns manager's response
            mockMetadataManager.addExpiry.mockResolvedValue({ added: true, id: 123 });

            const result = await metadataJanitor.addExpiry('example.com', 'test-kid');

            expect(result).toEqual({ added: true, id: 123 });
        });

        it('should handle errors from metadataManager', async () => {
            // Test: Propagates manager errors
            mockMetadataManager.addExpiry.mockRejectedValue(new Error('Database connection failed'));

            await expect(metadataJanitor.addExpiry('example.com', 'test-kid'))
                .rejects.toThrow('Database connection failed');
        });

        it('should handle multiple expiry additions', async () => {
            // Test: Sequential expiry additions
            await metadataJanitor.addExpiry('domain1.com', 'kid1');
            await metadataJanitor.addExpiry('domain2.com', 'kid2');
            await metadataJanitor.addExpiry('domain3.com', 'kid3');

            expect(mockMetadataManager.addExpiry).toHaveBeenCalledTimes(3);
        });
    });

    describe('integration scenarios', () => {
        it('should handle full metadata lifecycle', async () => {
            // Test: Origin creation → expiry addition → archived deletion
            await metadataJanitor.addExpiry('example.com', 'test-kid');
            await metadataJanitor.deleteOrigin('example.com', 'test-kid');
            await metadataJanitor.deleteArchived('test-kid');

            expect(mockMetadataManager.addExpiry).toHaveBeenCalled();
            expect(mockMetadataManager.deleteOrigin).toHaveBeenCalled();
            expect(mockMetadataManager.deleteArchived).toHaveBeenCalled();
        });

        it('should handle concurrent operations', async () => {
            // Test: Multiple metadata operations in parallel
            await Promise.all([
                metadataJanitor.addExpiry('domain1.com', 'kid1'),
                metadataJanitor.deleteOrigin('domain2.com', 'kid2'),
                metadataJanitor.deleteArchived('kid3')
            ]);

            expect(mockMetadataManager.addExpiry).toHaveBeenCalledTimes(1);
            expect(mockMetadataManager.deleteOrigin).toHaveBeenCalledTimes(1);
            expect(mockMetadataManager.deleteArchived).toHaveBeenCalledTimes(1);
        });

        it('should work with different domain formats', async () => {
            // Test: Various domain naming patterns
            await metadataJanitor.addExpiry('sub.domain.com', 'kid1');
            await metadataJanitor.deleteOrigin('another-domain.net', 'kid2');

            expect(mockMetadataManager.addExpiry).toHaveBeenCalledWith('sub.domain.com', 'kid1', expect.any(Date));
            expect(mockMetadataManager.deleteOrigin).toHaveBeenCalledWith('another-domain.net', 'kid2');
        });
    });

    describe('delegation pattern', () => {
        it('should act as thin wrapper around metadataManager', async () => {
            // Test: All methods delegate to manager
            await metadataJanitor.deleteOrigin('domain.com', 'kid');
            await metadataJanitor.deleteArchived('kid');
            await metadataJanitor.addExpiry('domain.com', 'kid');

            expect(mockMetadataManager.deleteOrigin).toHaveBeenCalledTimes(1);
            expect(mockMetadataManager.deleteArchived).toHaveBeenCalledTimes(1);
            expect(mockMetadataManager.addExpiry).toHaveBeenCalledTimes(1);
        });

        it('should not modify parameters except addExpiry date calculation', async () => {
            // Test: Parameters pass through unmodified
            const domain = 'unchanged.domain.com';
            const kid = 'unchanged-kid-123';

            await metadataJanitor.deleteOrigin(domain, kid);
            await metadataJanitor.deleteArchived(kid);

            expect(mockMetadataManager.deleteOrigin).toHaveBeenCalledWith(domain, kid);
            expect(mockMetadataManager.deleteArchived).toHaveBeenCalledWith(kid);
        });
    });

    describe('error handling', () => {
        it('should propagate all manager errors without modification', async () => {
            // Test: Errors bubble up unchanged
            const specificError = new Error('Specific database constraint violation');
            mockMetadataManager.deleteOrigin.mockRejectedValue(specificError);

            await expect(metadataJanitor.deleteOrigin('domain.com', 'kid'))
                .rejects.toBe(specificError);
        });

        it('should handle timeout errors', async () => {
            // Test: Async operation timeouts
            mockMetadataManager.addExpiry.mockRejectedValue(new Error('Operation timeout'));

            await expect(metadataJanitor.addExpiry('domain.com', 'kid'))
                .rejects.toThrow('Operation timeout');
        });
    });
});
