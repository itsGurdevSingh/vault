import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyDeleter } from '../../../../src/domain/key-manager/modules/Janitor/KeyDeleter.js';
import { unlink } from 'fs/promises';

// Mock fs/promises module
vi.mock('fs/promises', () => ({
    unlink: vi.fn()
}));

describe('KeyDeleter', () => {
    let keyDeleter;
    let mockPaths;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Create mock paths
        mockPaths = {
            privateKey: vi.fn((domain, kid) => `/storage/keys/${domain}/${kid}/private.pem`),
            publicKey: vi.fn((domain, kid) => `/storage/keys/${domain}/${kid}/public.pem`)
        };

        keyDeleter = new KeyDeleter(mockPaths);
    });

    describe('constructor', () => {
        it('should initialize with paths', () => {
            // Test: KeyDeleter stores paths dependency
            expect(keyDeleter.paths).toBe(mockPaths);
        });

        it('should accept paths as parameter', () => {
            // Test: Dependency injection works
            const customPaths = { custom: 'paths' };
            const deleter = new KeyDeleter(customPaths);

            expect(deleter.paths).toBe(customPaths);
        });
    });

    describe('deletePrivateKey', () => {
        it('should delete private key file successfully', async () => {
            // Test: Deletes file at correct path
            unlink.mockResolvedValue(undefined);

            await keyDeleter.deletePrivateKey('example.com', 'test-kid-123');

            expect(mockPaths.privateKey).toHaveBeenCalledWith('example.com', 'test-kid-123');
            expect(unlink).toHaveBeenCalledWith('/storage/keys/example.com/test-kid-123/private.pem');
        });

        it('should call paths.privateKey with correct parameters', async () => {
            // Test: Path resolution uses domain and kid
            unlink.mockResolvedValue(undefined);

            await keyDeleter.deletePrivateKey('test.domain.com', 'kid-456');

            expect(mockPaths.privateKey).toHaveBeenCalledWith('test.domain.com', 'kid-456');
        });

        it('should handle ENOENT error gracefully (file already deleted)', async () => {
            // Test: Ignores "file not found" errors
            const enoentError = new Error('File not found');
            enoentError.code = 'ENOENT';
            unlink.mockRejectedValue(enoentError);

            await expect(keyDeleter.deletePrivateKey('example.com', 'test-kid'))
                .resolves.toBeUndefined();
        });

        it('should throw other filesystem errors', async () => {
            // Test: Propagates non-ENOENT errors
            const permissionError = new Error('Permission denied');
            permissionError.code = 'EACCES';
            unlink.mockRejectedValue(permissionError);

            await expect(keyDeleter.deletePrivateKey('example.com', 'test-kid'))
                .rejects.toThrow('Permission denied');
        });

        it('should handle multiple deletions', async () => {
            // Test: Can delete multiple files sequentially
            unlink.mockResolvedValue(undefined);

            await keyDeleter.deletePrivateKey('domain1.com', 'kid-1');
            await keyDeleter.deletePrivateKey('domain2.com', 'kid-2');

            expect(unlink).toHaveBeenCalledTimes(2);
        });

        it('should work with different domain formats', async () => {
            // Test: Handles various domain naming conventions
            unlink.mockResolvedValue(undefined);

            await keyDeleter.deletePrivateKey('sub.domain.com', 'kid-1');
            expect(mockPaths.privateKey).toHaveBeenCalledWith('sub.domain.com', 'kid-1');
        });
    });

    describe('deletePublicKey', () => {
        it('should delete public key file successfully', async () => {
            // Test: Deletes file at correct path
            unlink.mockResolvedValue(undefined);

            await keyDeleter.deletePublicKey('example.com', 'test-kid-123');

            expect(mockPaths.publicKey).toHaveBeenCalledWith('example.com', 'test-kid-123');
            expect(unlink).toHaveBeenCalledWith('/storage/keys/example.com/test-kid-123/public.pem');
        });

        it('should call paths.publicKey with correct parameters', async () => {
            // Test: Path resolution uses domain and kid
            unlink.mockResolvedValue(undefined);

            await keyDeleter.deletePublicKey('public.domain.com', 'public-kid-789');

            expect(mockPaths.publicKey).toHaveBeenCalledWith('public.domain.com', 'public-kid-789');
        });

        it('should handle ENOENT error gracefully (file already deleted)', async () => {
            // Test: Ignores "file not found" errors
            const enoentError = new Error('File not found');
            enoentError.code = 'ENOENT';
            unlink.mockRejectedValue(enoentError);

            await expect(keyDeleter.deletePublicKey('example.com', 'test-kid'))
                .resolves.toBeUndefined();
        });

        it('should throw other filesystem errors', async () => {
            // Test: Propagates non-ENOENT errors
            const ioError = new Error('I/O error');
            ioError.code = 'EIO';
            unlink.mockRejectedValue(ioError);

            await expect(keyDeleter.deletePublicKey('example.com', 'test-kid'))
                .rejects.toThrow('I/O error');
        });

        it('should handle multiple deletions', async () => {
            // Test: Can delete multiple files sequentially
            unlink.mockResolvedValue(undefined);

            await keyDeleter.deletePublicKey('domain1.com', 'kid-1');
            await keyDeleter.deletePublicKey('domain2.com', 'kid-2');
            await keyDeleter.deletePublicKey('domain3.com', 'kid-3');

            expect(unlink).toHaveBeenCalledTimes(3);
        });
    });

    describe('error handling patterns', () => {
        it('should distinguish between ENOENT and other errors', async () => {
            // Test: Error code discrimination
            const enoentError = new Error('ENOENT');
            enoentError.code = 'ENOENT';
            const otherError = new Error('OTHER');
            otherError.code = 'OTHER';

            unlink.mockRejectedValueOnce(enoentError);
            unlink.mockRejectedValueOnce(otherError);

            await expect(keyDeleter.deletePrivateKey('domain.com', 'kid1'))
                .resolves.toBeUndefined();
            await expect(keyDeleter.deletePrivateKey('domain.com', 'kid2'))
                .rejects.toThrow('OTHER');
        });

        it('should handle errors without code property', async () => {
            // Test: Errors without .code property are thrown
            const genericError = new Error('Generic error');
            unlink.mockRejectedValue(genericError);

            await expect(keyDeleter.deletePrivateKey('example.com', 'kid'))
                .rejects.toThrow('Generic error');
        });
    });

    describe('integration scenarios', () => {
        it('should delete both private and public keys for same domain/kid', async () => {
            // Test: Coordinated deletion of key pair
            unlink.mockResolvedValue(undefined);

            await keyDeleter.deletePrivateKey('example.com', 'test-kid');
            await keyDeleter.deletePublicKey('example.com', 'test-kid');

            expect(mockPaths.privateKey).toHaveBeenCalledWith('example.com', 'test-kid');
            expect(mockPaths.publicKey).toHaveBeenCalledWith('example.com', 'test-kid');
            expect(unlink).toHaveBeenCalledTimes(2);
        });

        it('should handle partial deletion (private succeeds, public fails)', async () => {
            // Test: Independent deletion operations
            unlink
                .mockResolvedValueOnce(undefined) // private succeeds
                .mockRejectedValueOnce(new Error('Public deletion failed')); // public fails

            await keyDeleter.deletePrivateKey('example.com', 'kid');
            await expect(keyDeleter.deletePublicKey('example.com', 'kid'))
                .rejects.toThrow('Public deletion failed');

            expect(unlink).toHaveBeenCalledTimes(2);
        });

        it('should work with concurrent deletions', async () => {
            // Test: Multiple concurrent delete operations
            unlink.mockResolvedValue(undefined);

            await Promise.all([
                keyDeleter.deletePrivateKey('domain1.com', 'kid1'),
                keyDeleter.deletePrivateKey('domain2.com', 'kid2'),
                keyDeleter.deletePublicKey('domain3.com', 'kid3')
            ]);

            expect(unlink).toHaveBeenCalledTimes(3);
        });
    });
});
