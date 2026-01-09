import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyReader } from '../../../../../src/domain/key-manager/modules/loader/KeyReader.js';
import { readFile } from 'fs/promises';

// Mock fs/promises module
vi.mock('fs/promises', () => ({
    readFile: vi.fn()
}));

describe('KeyReader', () => {
    let keyReader;
    let mockCache;
    let mockPaths;
    let mockCryptoEngine;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();

        // Create mock cache with get/set methods
        mockCache = {
            private: new Map(),
            public: new Map(),
            setPrivate: vi.fn((kid, pem) => mockCache.private.set(kid, pem)),
            setPublic: vi.fn((kid, pem) => mockCache.public.set(kid, pem))
        };

        // Create mock paths repository
        mockPaths = {
            privateKey: vi.fn((domain, kid) => `/storage/keys/${domain}/private/${kid}.pem`),
            publicKey: vi.fn((domain, kid) => `/storage/keys/${domain}/public/${kid}.pem`)
        };

        // Create mock crypto engine
        mockCryptoEngine = {
            getInfo: vi.fn((kid) => {
                const parts = kid.split('-');
                return {
                    domain: parts[0],
                    date: parts[1],
                    time: parts[2],
                    uniqueId: parts[3]
                };
            })
        };

        keyReader = new KeyReader(mockCache, mockPaths, mockCryptoEngine);
    });

    describe('constructor', () => {
        it('should initialize with injected dependencies', () => {
            // Test: Verify all dependencies are stored
            expect(keyReader.cache).toBe(mockCache);
            expect(keyReader.paths).toBe(mockPaths);
            expect(keyReader.cryptoEngine).toBe(mockCryptoEngine);
        });
    });

    describe('privateKey', () => {
        it('should read private key from filesystem when not cached', async () => {
            // Test: Cache miss - read from disk
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const expectedPem = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';

            readFile.mockResolvedValue(expectedPem);

            const pem = await keyReader.privateKey(kid);

            expect(pem).toBe(expectedPem);
            expect(mockCryptoEngine.getInfo).toHaveBeenCalledWith(kid);
            expect(mockPaths.privateKey).toHaveBeenCalledWith('testdomain', kid);
            expect(readFile).toHaveBeenCalledWith('/storage/keys/testdomain/private/testdomain-20260109-143022-ABCD1234.pem', 'utf8');
        });

        it('should cache private key after reading from disk', async () => {
            // Test: Verify key is cached after first read
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const expectedPem = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';

            readFile.mockResolvedValue(expectedPem);

            await keyReader.privateKey(kid);

            expect(mockCache.setPrivate).toHaveBeenCalledWith(kid, expectedPem);
            expect(mockCache.private.get(kid)).toBe(expectedPem);
        });

        it('should return cached private key without reading disk', async () => {
            // Test: Cache hit - no disk read
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const cachedPem = '-----BEGIN PRIVATE KEY-----\ncached\n-----END PRIVATE KEY-----';

            mockCache.private.set(kid, cachedPem);

            const pem = await keyReader.privateKey(kid);

            expect(pem).toBe(cachedPem);
            expect(readFile).not.toHaveBeenCalled();
            expect(mockCryptoEngine.getInfo).not.toHaveBeenCalled();
        });

        it('should extract domain from KID correctly', async () => {
            // Test: Domain extraction logic
            const kid = 'mycustomdomain-20260109-143022-ABCD1234';
            readFile.mockResolvedValue('test key');

            await keyReader.privateKey(kid);

            expect(mockPaths.privateKey).toHaveBeenCalledWith('mycustomdomain', kid);
        });

        it('should handle multiple reads for different KIDs', async () => {
            // Test: Multiple keys read and cached separately
            const kid1 = 'domain1-20260109-143022-ABCD1234';
            const kid2 = 'domain2-20260109-143023-EFGH5678';

            readFile
                .mockResolvedValueOnce('private key 1')
                .mockResolvedValueOnce('private key 2');

            const pem1 = await keyReader.privateKey(kid1);
            const pem2 = await keyReader.privateKey(kid2);

            expect(pem1).toBe('private key 1');
            expect(pem2).toBe('private key 2');
            expect(readFile).toHaveBeenCalledTimes(2);
            expect(mockCache.private.size).toBe(2);
        });

        it('should handle filesystem read errors', async () => {
            // Test: Propagate filesystem errors
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const fsError = new Error('ENOENT: file not found');

            readFile.mockRejectedValue(fsError);

            await expect(keyReader.privateKey(kid))
                .rejects
                .toThrow('ENOENT: file not found');
        });

        it('should read file with utf8 encoding', async () => {
            // Test: Verify correct encoding is used
            const kid = 'testdomain-20260109-143022-ABCD1234';
            readFile.mockResolvedValue('test');

            await keyReader.privateKey(kid);

            expect(readFile).toHaveBeenCalledWith(
                expect.any(String),
                'utf8'
            );
        });
    });

    describe('publicKey', () => {
        it('should read public key from filesystem when not cached', async () => {
            // Test: Cache miss - read from disk
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const expectedPem = '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----';

            readFile.mockResolvedValue(expectedPem);

            const pem = await keyReader.publicKey(kid);

            expect(pem).toBe(expectedPem);
            expect(mockCryptoEngine.getInfo).toHaveBeenCalledWith(kid);
            expect(mockPaths.publicKey).toHaveBeenCalledWith('testdomain', kid);
            expect(readFile).toHaveBeenCalledWith('/storage/keys/testdomain/public/testdomain-20260109-143022-ABCD1234.pem', 'utf8');
        });

        it('should cache public key after reading from disk', async () => {
            // Test: Verify key is cached after first read
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const expectedPem = '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----';

            readFile.mockResolvedValue(expectedPem);

            await keyReader.publicKey(kid);

            expect(mockCache.setPublic).toHaveBeenCalledWith(kid, expectedPem);
            expect(mockCache.public.get(kid)).toBe(expectedPem);
        });

        it('should return cached public key without reading disk', async () => {
            // Test: Cache hit - no disk read
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const cachedPem = '-----BEGIN PUBLIC KEY-----\ncached\n-----END PUBLIC KEY-----';

            mockCache.public.set(kid, cachedPem);

            const pem = await keyReader.publicKey(kid);

            expect(pem).toBe(cachedPem);
            expect(readFile).not.toHaveBeenCalled();
            expect(mockCryptoEngine.getInfo).not.toHaveBeenCalled();
        });

        it('should extract domain from KID correctly', async () => {
            // Test: Domain extraction for public keys
            const kid = 'anotherdomain-20260109-143022-ABCD1234';
            readFile.mockResolvedValue('test key');

            await keyReader.publicKey(kid);

            expect(mockPaths.publicKey).toHaveBeenCalledWith('anotherdomain', kid);
        });

        it('should handle multiple reads for different KIDs', async () => {
            // Test: Multiple public keys cached independently
            const kid1 = 'domain1-20260109-143022-ABCD1234';
            const kid2 = 'domain2-20260109-143023-EFGH5678';

            readFile
                .mockResolvedValueOnce('public key 1')
                .mockResolvedValueOnce('public key 2');

            const pem1 = await keyReader.publicKey(kid1);
            const pem2 = await keyReader.publicKey(kid2);

            expect(pem1).toBe('public key 1');
            expect(pem2).toBe('public key 2');
            expect(readFile).toHaveBeenCalledTimes(2);
            expect(mockCache.public.size).toBe(2);
        });

        it('should handle filesystem read errors', async () => {
            // Test: Propagate filesystem errors for public keys
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const fsError = new Error('Permission denied');

            readFile.mockRejectedValue(fsError);

            await expect(keyReader.publicKey(kid))
                .rejects
                .toThrow('Permission denied');
        });
    });

    describe('cache behavior', () => {
        it('should maintain separate caches for private and public keys', async () => {
            // Test: Private and public caches are independent
            const kid = 'testdomain-20260109-143022-ABCD1234';

            readFile
                .mockResolvedValueOnce('private pem')
                .mockResolvedValueOnce('public pem');

            await keyReader.privateKey(kid);
            await keyReader.publicKey(kid);

            expect(mockCache.private.get(kid)).toBe('private pem');
            expect(mockCache.public.get(kid)).toBe('public pem');
        });

        it('should not cache on read error', async () => {
            // Test: Failed reads don't poison cache
            const kid = 'testdomain-20260109-143022-ABCD1234';

            readFile.mockRejectedValueOnce(new Error('Read failed'));

            await expect(keyReader.privateKey(kid)).rejects.toThrow();

            expect(mockCache.setPrivate).not.toHaveBeenCalled();
            expect(mockCache.private.has(kid)).toBe(false);
        });

        it('should use cache for repeated reads of same key', async () => {
            // Test: Cache effectiveness - single disk read for multiple requests
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const pem = 'test key';

            readFile.mockResolvedValue(pem);

            // First read - cache miss
            await keyReader.privateKey(kid);
            expect(readFile).toHaveBeenCalledTimes(1);

            // Subsequent reads - cache hits
            await keyReader.privateKey(kid);
            await keyReader.privateKey(kid);
            await keyReader.privateKey(kid);

            expect(readFile).toHaveBeenCalledTimes(1); // Still only 1 disk read
        });
    });

    describe('integration with dependencies', () => {
        it('should use cryptoEngine to parse KID', async () => {
            // Test: CryptoEngine getInfo integration
            const kid = 'complexdomain-20260109-143022-ABCD1234';

            mockCryptoEngine.getInfo.mockReturnValue({
                domain: 'complexdomain',
                date: '20260109',
                time: '143022',
                uniqueId: 'ABCD1234'
            });

            readFile.mockResolvedValue('test');

            await keyReader.privateKey(kid);

            expect(mockCryptoEngine.getInfo).toHaveBeenCalledWith(kid);
        });

        it('should use paths to construct file paths', async () => {
            // Test: Paths repository integration
            const kid = 'testdomain-20260109-143022-ABCD1234';

            mockPaths.privateKey.mockReturnValue('/custom/path/to/key.pem');
            readFile.mockResolvedValue('test');

            await keyReader.privateKey(kid);

            expect(mockPaths.privateKey).toHaveBeenCalledWith('testdomain', kid);
            expect(readFile).toHaveBeenCalledWith('/custom/path/to/key.pem', 'utf8');
        });

        it('should handle concurrent reads efficiently', async () => {
            // Test: Multiple simultaneous reads
            const kids = [
                'domain1-20260109-143022-ABCD1234',
                'domain2-20260109-143023-EFGH5678',
                'domain3-20260109-143024-IJKL9012'
            ];

            readFile.mockResolvedValue('test key');

            const promises = kids.map(kid => keyReader.privateKey(kid));
            await Promise.all(promises);

            expect(readFile).toHaveBeenCalledTimes(3);
            expect(mockCache.private.size).toBe(3);
        });
    });

    describe('error scenarios', () => {
        it('should handle malformed KID gracefully', async () => {
            // Test: Invalid KID format
            const kid = 'invalid-kid';

            mockCryptoEngine.getInfo.mockReturnValue({ domain: 'invalid' });
            readFile.mockResolvedValue('test');

            await keyReader.privateKey(kid);

            expect(mockPaths.privateKey).toHaveBeenCalledWith('invalid', kid);
        });

        it('should handle empty cache correctly', async () => {
            // Test: Fresh KeyReader instance with no cached keys
            readFile.mockResolvedValue('test');

            expect(mockCache.private.size).toBe(0);
            expect(mockCache.public.size).toBe(0);

            await keyReader.privateKey('test-20260109-143022-ABCD1234');

            expect(mockCache.private.size).toBe(1);
        });
    });
});
