import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyFileJanitor } from '../../../../src/domain/key-manager/modules/Janitor/KeyFileJanitor.js';

describe('KeyFileJanitor', () => {
    let keyFileJanitor;
    let mockLoaderCache;
    let mockBuilderCache;
    let mockSignerCache;
    let mockKeyDeleter;

    beforeEach(() => {
        // Create mock caches
        mockLoaderCache = {
            private: {
                delete: vi.fn().mockResolvedValue(true)
            },
            public: {
                delete: vi.fn().mockResolvedValue(true)
            }
        };

        mockBuilderCache = {
            delete: vi.fn().mockResolvedValue(true)
        };

        mockSignerCache = {
            delete: vi.fn().mockResolvedValue(true)
        };

        mockKeyDeleter = {
            deletePrivateKey: vi.fn().mockResolvedValue(undefined),
            deletePublicKey: vi.fn().mockResolvedValue(undefined)
        };

        keyFileJanitor = new KeyFileJanitor(
            mockLoaderCache,
            mockBuilderCache,
            mockSignerCache,
            mockKeyDeleter
        );
    });

    describe('constructor', () => {
        it('should initialize with all dependencies', () => {
            // Test: All dependencies are stored
            expect(keyFileJanitor.loaderCache).toBe(mockLoaderCache);
            expect(keyFileJanitor.builderCache).toBe(mockBuilderCache);
            expect(keyFileJanitor.signerCache).toBe(mockSignerCache);
            expect(keyFileJanitor.KeyDeleter).toBe(mockKeyDeleter);
        });

        it('should accept loaderCache as first parameter', () => {
            // Test: Loader cache dependency injection
            const customCache = { custom: 'loader' };
            const janitor = new KeyFileJanitor(customCache, mockBuilderCache, mockSignerCache, mockKeyDeleter);

            expect(janitor.loaderCache).toBe(customCache);
        });

        it('should accept builderCache as second parameter', () => {
            // Test: Builder cache dependency injection
            const customCache = { custom: 'builder' };
            const janitor = new KeyFileJanitor(mockLoaderCache, customCache, mockSignerCache, mockKeyDeleter);

            expect(janitor.builderCache).toBe(customCache);
        });

        it('should accept signerCache as third parameter', () => {
            // Test: Signer cache dependency injection
            const customCache = { custom: 'signer' };
            const janitor = new KeyFileJanitor(mockLoaderCache, mockBuilderCache, customCache, mockKeyDeleter);

            expect(janitor.signerCache).toBe(customCache);
        });

        it('should accept KeyDeleter as fourth parameter', () => {
            // Test: KeyDeleter dependency injection
            const customDeleter = { custom: 'deleter' };
            const janitor = new KeyFileJanitor(mockLoaderCache, mockBuilderCache, mockSignerCache, customDeleter);

            expect(janitor.KeyDeleter).toBe(customDeleter);
        });
    });

    describe('deletePrivate', () => {
        it('should delete private key file first, then invalidate caches', async () => {
            // Test: Two-phase deletion - filesystem then cache
            const callOrder = [];
            mockKeyDeleter.deletePrivateKey.mockImplementation(async () => {
                callOrder.push('filesystem');
            });
            mockSignerCache.delete.mockImplementation(async () => {
                callOrder.push('signer-cache');
            });
            mockLoaderCache.private.delete.mockImplementation(async () => {
                callOrder.push('loader-cache');
            });

            await keyFileJanitor.deletePrivate('example.com', 'test-kid');

            expect(callOrder).toEqual(['filesystem', 'signer-cache', 'loader-cache']);
        });

        it('should call KeyDeleter.deletePrivateKey with correct parameters', async () => {
            // Test: Filesystem deletion receives domain and kid
            await keyFileJanitor.deletePrivate('example.com', 'test-kid-123');

            expect(mockKeyDeleter.deletePrivateKey).toHaveBeenCalledWith('example.com', 'test-kid-123');
        });

        it('should invalidate signer cache after filesystem deletion', async () => {
            // Test: Signer cache cleared (CryptoKey removal)
            await keyFileJanitor.deletePrivate('example.com', 'test-kid');

            expect(mockSignerCache.delete).toHaveBeenCalledWith('test-kid');
        });

        it('should invalidate loader private cache after filesystem deletion', async () => {
            // Test: Loader cache cleared
            await keyFileJanitor.deletePrivate('example.com', 'test-kid');

            expect(mockLoaderCache.private.delete).toHaveBeenCalledWith('test-kid');
        });

        it('should throw error if filesystem deletion fails', async () => {
            // Test: Filesystem failure stops cache invalidation
            mockKeyDeleter.deletePrivateKey.mockRejectedValue(new Error('Disk error'));

            await expect(keyFileJanitor.deletePrivate('example.com', 'test-kid'))
                .rejects.toThrow('Failed to delete private key for domain example.com and kid test-kid: Disk error');

            // Caches should NOT be invalidated
            expect(mockSignerCache.delete).not.toHaveBeenCalled();
            expect(mockLoaderCache.private.delete).not.toHaveBeenCalled();
        });

        it('should propagate cache invalidation errors', async () => {
            // Test: Cache errors are wrapped with context
            mockSignerCache.delete.mockRejectedValue(new Error('Cache unavailable'));

            await expect(keyFileJanitor.deletePrivate('example.com', 'test-kid'))
                .rejects.toThrow('Failed to delete private key for domain example.com and kid test-kid: Cache unavailable');
        });

        it('should handle multiple domains', async () => {
            // Test: Works with different domain values
            await keyFileJanitor.deletePrivate('domain1.com', 'kid1');
            await keyFileJanitor.deletePrivate('domain2.com', 'kid2');

            expect(mockKeyDeleter.deletePrivateKey).toHaveBeenCalledTimes(2);
            expect(mockSignerCache.delete).toHaveBeenCalledTimes(2);
        });

        it('should include error details in wrapped error message', async () => {
            // Test: Error wrapping preserves original message
            mockKeyDeleter.deletePrivateKey.mockRejectedValue(new Error('Permission denied'));

            await expect(keyFileJanitor.deletePrivate('secure.com', 'secure-kid'))
                .rejects.toThrow(/Permission denied/);
        });
    });

    describe('deletePublic', () => {
        it('should delete public key file first, then invalidate caches', async () => {
            // Test: Three-phase deletion - filesystem, loader cache, builder cache
            const callOrder = [];
            mockKeyDeleter.deletePublicKey.mockImplementation(async () => {
                callOrder.push('filesystem');
            });
            mockLoaderCache.public.delete.mockImplementation(async () => {
                callOrder.push('loader-cache');
            });
            mockBuilderCache.delete.mockImplementation(async () => {
                callOrder.push('builder-cache');
            });

            await keyFileJanitor.deletePublic('example.com', 'test-kid');

            expect(callOrder).toEqual(['filesystem', 'loader-cache', 'builder-cache']);
        });

        it('should call KeyDeleter.deletePublicKey with correct parameters', async () => {
            // Test: Filesystem deletion receives domain and kid
            await keyFileJanitor.deletePublic('public.domain.com', 'public-kid-456');

            expect(mockKeyDeleter.deletePublicKey).toHaveBeenCalledWith('public.domain.com', 'public-kid-456');
        });

        it('should invalidate loader public cache after filesystem deletion', async () => {
            // Test: Loader cache cleared
            await keyFileJanitor.deletePublic('example.com', 'test-kid');

            expect(mockLoaderCache.public.delete).toHaveBeenCalledWith('test-kid');
        });

        it('should invalidate builder cache if present', async () => {
            // Test: Builder cache cleared (JWKS invalidation)
            await keyFileJanitor.deletePublic('example.com', 'test-kid');

            expect(mockBuilderCache.delete).toHaveBeenCalledWith('test-kid');
        });

        it('should skip builder cache if not present', async () => {
            // Test: Handles optional builder cache
            const janitorWithoutBuilder = new KeyFileJanitor(
                mockLoaderCache,
                null,
                mockSignerCache,
                mockKeyDeleter
            );

            await expect(janitorWithoutBuilder.deletePublic('example.com', 'test-kid'))
                .resolves.toBeUndefined();

            expect(mockKeyDeleter.deletePublicKey).toHaveBeenCalled();
        });

        it('should throw error if filesystem deletion fails', async () => {
            // Test: Filesystem failure stops cache invalidation
            mockKeyDeleter.deletePublicKey.mockRejectedValue(new Error('File locked'));

            await expect(keyFileJanitor.deletePublic('example.com', 'test-kid'))
                .rejects.toThrow('Failed to delete public key for domain example.com and kid test-kid: File locked');

            // Caches should NOT be invalidated
            expect(mockLoaderCache.public.delete).not.toHaveBeenCalled();
            expect(mockBuilderCache.delete).not.toHaveBeenCalled();
        });

        it('should propagate cache invalidation errors', async () => {
            // Test: Cache errors are wrapped with context
            mockLoaderCache.public.delete.mockRejectedValue(new Error('Cache connection lost'));

            await expect(keyFileJanitor.deletePublic('example.com', 'test-kid'))
                .rejects.toThrow('Failed to delete public key for domain example.com and kid test-kid: Cache connection lost');
        });

        it('should handle multiple deletions', async () => {
            // Test: Sequential public key deletions
            await keyFileJanitor.deletePublic('domain1.com', 'kid1');
            await keyFileJanitor.deletePublic('domain2.com', 'kid2');
            await keyFileJanitor.deletePublic('domain3.com', 'kid3');

            expect(mockKeyDeleter.deletePublicKey).toHaveBeenCalledTimes(3);
            expect(mockBuilderCache.delete).toHaveBeenCalledTimes(3);
        });
    });

    describe('cache invalidation strategy', () => {
        it('should ensure filesystem is source of truth', async () => {
            // Test: Filesystem deletion happens before cache invalidation
            let filesystemDeleted = false;
            mockKeyDeleter.deletePrivateKey.mockImplementation(async () => {
                filesystemDeleted = true;
            });
            mockSignerCache.delete.mockImplementation(async () => {
                expect(filesystemDeleted).toBe(true);
            });

            await keyFileJanitor.deletePrivate('example.com', 'test-kid');
        });

        it('should not invalidate caches if filesystem deletion fails', async () => {
            // Test: Cache remains valid when file still exists
            mockKeyDeleter.deletePrivateKey.mockRejectedValue(new Error('Failure'));

            try {
                await keyFileJanitor.deletePrivate('example.com', 'test-kid');
            } catch (err) {
                // Expected
            }

            expect(mockSignerCache.delete).not.toHaveBeenCalled();
            expect(mockLoaderCache.private.delete).not.toHaveBeenCalled();
        });

        it('should invalidate all relevant caches for private keys', async () => {
            // Test: Both signer and loader caches cleared
            await keyFileJanitor.deletePrivate('example.com', 'test-kid');

            expect(mockSignerCache.delete).toHaveBeenCalledWith('test-kid');
            expect(mockLoaderCache.private.delete).toHaveBeenCalledWith('test-kid');
        });

        it('should invalidate all relevant caches for public keys', async () => {
            // Test: Both loader and builder caches cleared
            await keyFileJanitor.deletePublic('example.com', 'test-kid');

            expect(mockLoaderCache.public.delete).toHaveBeenCalledWith('test-kid');
            expect(mockBuilderCache.delete).toHaveBeenCalledWith('test-kid');
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete key pair deletion', async () => {
            // Test: Delete both private and public keys
            await keyFileJanitor.deletePrivate('example.com', 'test-kid');
            await keyFileJanitor.deletePublic('example.com', 'test-kid');

            expect(mockKeyDeleter.deletePrivateKey).toHaveBeenCalled();
            expect(mockKeyDeleter.deletePublicKey).toHaveBeenCalled();
            expect(mockSignerCache.delete).toHaveBeenCalled();
            expect(mockLoaderCache.private.delete).toHaveBeenCalled();
            expect(mockLoaderCache.public.delete).toHaveBeenCalled();
            expect(mockBuilderCache.delete).toHaveBeenCalled();
        });

        it('should handle concurrent deletions for different kids', async () => {
            // Test: Multiple simultaneous deletions
            await Promise.all([
                keyFileJanitor.deletePrivate('domain1.com', 'kid1'),
                keyFileJanitor.deletePrivate('domain2.com', 'kid2'),
                keyFileJanitor.deletePublic('domain3.com', 'kid3')
            ]);

            expect(mockKeyDeleter.deletePrivateKey).toHaveBeenCalledTimes(2);
            expect(mockKeyDeleter.deletePublicKey).toHaveBeenCalledTimes(1);
        });

        it('should work with minimal cache configuration', async () => {
            // Test: Builder cache is optional
            const minimalJanitor = new KeyFileJanitor(
                mockLoaderCache,
                null, // No builder cache
                mockSignerCache,
                mockKeyDeleter
            );

            await expect(minimalJanitor.deletePublic('example.com', 'test-kid'))
                .resolves.toBeUndefined();
        });
    });

    describe('error messages', () => {
        it('should include domain in error message', async () => {
            // Test: Error context includes domain
            mockKeyDeleter.deletePrivateKey.mockRejectedValue(new Error('Failure'));

            await expect(keyFileJanitor.deletePrivate('specific-domain.com', 'kid'))
                .rejects.toThrow(/specific-domain\.com/);
        });

        it('should include kid in error message', async () => {
            // Test: Error context includes kid
            mockKeyDeleter.deletePublicKey.mockRejectedValue(new Error('Failure'));

            await expect(keyFileJanitor.deletePublic('domain.com', 'specific-kid-789'))
                .rejects.toThrow(/specific-kid-789/);
        });

        it('should include original error message', async () => {
            // Test: Original error details preserved
            mockKeyDeleter.deletePrivateKey.mockRejectedValue(new Error('Original error details'));

            await expect(keyFileJanitor.deletePrivate('domain.com', 'kid'))
                .rejects.toThrow(/Original error details/);
        });
    });
});
