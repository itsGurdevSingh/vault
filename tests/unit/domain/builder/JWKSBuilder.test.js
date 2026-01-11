import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwksBuilder } from '../../../../src/domain/key-manager/modules/builder/jwksBuilder.js';

describe('Builder', () => {
    let mockCache;
    let mockLoader;
    let mockCryptoEngine;
    let builder;

    beforeEach(() => {
        // Reset all mocks before each test
        mockCache = new Map();
        const originalGet = mockCache.get.bind(mockCache);
        const originalSet = mockCache.set.bind(mockCache);
        mockCache.get = vi.fn(originalGet);
        mockCache.set = vi.fn(originalSet);

        mockLoader = {
            getPublicKeyMap: vi.fn()
        };

        mockCryptoEngine = {
            pemToJWK: vi.fn()
        };

        builder = new JwksBuilder(mockCache, mockLoader, mockCryptoEngine);
    });

    describe('constructor', () => {
        it('should initialize with all required dependencies', () => {
            // Test: Verify all dependencies are stored
            expect(builder.cache).toBe(mockCache);
            expect(builder.loader).toBe(mockLoader);
            expect(builder.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should accept cache as first parameter', () => {
            // Test: Cache dependency injection
            const customCache = { custom: 'cache' };
            const b = new JwksBuilder(customCache, mockLoader, mockCryptoEngine);

            expect(b.cache).toBe(customCache);
        });

        it('should accept loader as second parameter', () => {
            // Test: Loader dependency injection
            const customLoader = { custom: 'loader' };
            const b = new JwksBuilder(mockCache, customLoader, mockCryptoEngine);

            expect(b.loader).toBe(customLoader);
        });

        it('should accept cryptoEngine as third parameter', () => {
            // Test: CryptoEngine dependency injection
            const customEngine = { custom: 'engine' };
            const b = new JwksBuilder(mockCache, mockLoader, customEngine);

            expect(b.cryptoEngine).toBe(customEngine);
        });
    });

    describe('getJWKS', () => {
        beforeEach(() => {
            // Setup default mock responses
            mockLoader.getPublicKeyMap.mockResolvedValue({});
            mockCryptoEngine.pemToJWK.mockResolvedValue({});
            mockCache.get.mockReturnValue(undefined);
        });

        it('should fetch public keys for domain from loader', async () => {
            // Test: Loader is called with correct domain
            const domain = 'example.com';

            await builder.getJWKS(domain);

            expect(mockLoader.getPublicKeyMap).toHaveBeenCalledWith(domain);
        });

        it('should return JWKS with keys array', async () => {
            // Test: Return format matches JWKS spec
            mockLoader.getPublicKeyMap.mockResolvedValue({});

            const result = await builder.getJWKS('example.com');

            expect(result).toHaveProperty('keys');
            expect(Array.isArray(result.keys)).toBe(true);
        });

        it('should return empty keys array when no public keys exist', async () => {
            // Test: Empty domain returns empty JWKS
            mockLoader.getPublicKeyMap.mockResolvedValue({});

            const result = await builder.getJWKS('example.com');

            expect(result.keys).toEqual([]);
        });

        it('should convert each PEM to JWK', async () => {
            // Test: All keys are converted
            mockLoader.getPublicKeyMap.mockResolvedValue({
                'kid-1': '-----BEGIN PUBLIC KEY-----\nKEY1\n-----END PUBLIC KEY-----',
                'kid-2': '-----BEGIN PUBLIC KEY-----\nKEY2\n-----END PUBLIC KEY-----'
            });
            mockCryptoEngine.pemToJWK.mockResolvedValue({ kty: 'RSA' });

            await builder.getJWKS('example.com');

            expect(mockCryptoEngine.pemToJWK).toHaveBeenCalledTimes(2);
        });

        it('should pass kid and pem to pemToJWK', async () => {
            // Test: Conversion receives correct parameters
            const kid = 'example-20260109-133000-abc123';
            const pem = '-----BEGIN PUBLIC KEY-----\nPUBLIC_KEY_DATA\n-----END PUBLIC KEY-----';

            mockLoader.getPublicKeyMap.mockResolvedValue({ [kid]: pem });
            mockCryptoEngine.pemToJWK.mockResolvedValue({ kty: 'RSA', kid });

            await builder.getJWKS('example.com');

            expect(mockCryptoEngine.pemToJWK).toHaveBeenCalledWith(pem, kid);
        });

        it('should include all converted JWKs in result', async () => {
            // Test: All JWKs appear in keys array
            mockLoader.getPublicKeyMap.mockResolvedValue({
                'kid-1': 'pem-1',
                'kid-2': 'pem-2',
                'kid-3': 'pem-3'
            });
            mockCryptoEngine.pemToJWK
                .mockResolvedValueOnce({ kty: 'RSA', kid: 'kid-1' })
                .mockResolvedValueOnce({ kty: 'RSA', kid: 'kid-2' })
                .mockResolvedValueOnce({ kty: 'RSA', kid: 'kid-3' });

            const result = await builder.getJWKS('example.com');

            expect(result.keys).toHaveLength(3);
            expect(result.keys).toEqual([
                { kty: 'RSA', kid: 'kid-1' },
                { kty: 'RSA', kid: 'kid-2' },
                { kty: 'RSA', kid: 'kid-3' }
            ]);
        });

        it('should handle different domains independently', async () => {
            // Test: Each domain gets its own JWKS
            mockLoader.getPublicKeyMap
                .mockResolvedValueOnce({ 'kid-1': 'pem-1' })
                .mockResolvedValueOnce({ 'kid-2': 'pem-2' });
            mockCryptoEngine.pemToJWK.mockResolvedValue({ kty: 'RSA' });

            await builder.getJWKS('domain1.com');
            await builder.getJWKS('domain2.com');

            expect(mockLoader.getPublicKeyMap).toHaveBeenCalledWith('domain1.com');
            expect(mockLoader.getPublicKeyMap).toHaveBeenCalledWith('domain2.com');
        });

        it('should preserve JWK properties from cryptoEngine', async () => {
            // Test: JWK data is not modified
            const jwk = {
                kty: 'RSA',
                kid: 'test-kid',
                use: 'sig',
                alg: 'RS256',
                n: 'modulus_value',
                e: 'AQAB'
            };
            mockLoader.getPublicKeyMap.mockResolvedValue({ 'test-kid': 'pem' });
            mockCryptoEngine.pemToJWK.mockResolvedValue(jwk);

            const result = await builder.getJWKS('example.com');

            expect(result.keys[0]).toEqual(jwk);
        });
    });

    describe('caching behavior', () => {
        beforeEach(() => {
            mockLoader.getPublicKeyMap.mockResolvedValue({});
        });

        it('should check cache before converting PEM', async () => {
            // Test: Cache lookup happens first
            const kid = 'cached-kid';
            const cachedJWK = { kty: 'RSA', kid, cached: true };

            mockLoader.getPublicKeyMap.mockResolvedValue({ [kid]: 'pem' });
            mockCache.get.mockReturnValue(cachedJWK);

            await builder.getJWKS('example.com');

            expect(mockCache.get).toHaveBeenCalledWith(kid);
            expect(mockCryptoEngine.pemToJWK).not.toHaveBeenCalled();
        });

        it('should return cached JWK if available', async () => {
            // Test: Cache hit returns cached value
            const kid = 'cached-kid';
            const cachedJWK = { kty: 'RSA', kid, cached: true };

            mockLoader.getPublicKeyMap.mockResolvedValue({ [kid]: 'pem' });
            mockCache.get.mockReturnValue(cachedJWK);

            const result = await builder.getJWKS('example.com');

            expect(result.keys[0]).toEqual(cachedJWK);
        });

        it('should cache JWK after conversion', async () => {
            // Test: Converted JWK is stored in cache
            const kid = 'new-kid';
            const pem = 'pem-data';
            const jwk = { kty: 'RSA', kid };

            mockLoader.getPublicKeyMap.mockResolvedValue({ [kid]: pem });
            mockCache.get.mockReturnValue(undefined);
            mockCryptoEngine.pemToJWK.mockResolvedValue(jwk);

            await builder.getJWKS('example.com');

            expect(mockCache.set).toHaveBeenCalledWith(kid, jwk);
        });

        it('should convert PEM if not in cache', async () => {
            // Test: Cache miss triggers conversion
            const kid = 'uncached-kid';
            const pem = 'pem-data';

            mockLoader.getPublicKeyMap.mockResolvedValue({ [kid]: pem });
            mockCache.get.mockReturnValue(undefined);
            mockCryptoEngine.pemToJWK.mockResolvedValue({ kty: 'RSA', kid });

            await builder.getJWKS('example.com');

            expect(mockCryptoEngine.pemToJWK).toHaveBeenCalledWith(pem, kid);
        });

        it('should handle mix of cached and uncached keys', async () => {
            // Test: Some keys from cache, some converted
            mockLoader.getPublicKeyMap.mockResolvedValue({
                'cached-1': 'pem-1',
                'uncached-1': 'pem-2',
                'cached-2': 'pem-3'
            });

            const cachedJWK1 = { kty: 'RSA', kid: 'cached-1', cached: true };
            const cachedJWK2 = { kty: 'RSA', kid: 'cached-2', cached: true };
            const convertedJWK = { kty: 'RSA', kid: 'uncached-1', cached: false };

            mockCache.get.mockImplementation((kid) => {
                if (kid === 'cached-1') return cachedJWK1;
                if (kid === 'cached-2') return cachedJWK2;
                return undefined;
            });
            mockCryptoEngine.pemToJWK.mockResolvedValue(convertedJWK);

            const result = await builder.getJWKS('example.com');

            expect(result.keys).toHaveLength(3);
            expect(mockCryptoEngine.pemToJWK).toHaveBeenCalledTimes(1);
            expect(mockCache.set).toHaveBeenCalledWith('uncached-1', convertedJWK);
        });

        it('should improve performance on subsequent calls with same domain', async () => {
            // Test: Second call uses cached JWKs
            const kid = 'repeat-kid';
            const jwk = { kty: 'RSA', kid };

            mockLoader.getPublicKeyMap.mockResolvedValue({ [kid]: 'pem' });
            mockCryptoEngine.pemToJWK.mockResolvedValue(jwk);

            // First call - converts
            mockCache.get.mockReturnValueOnce(undefined);
            await builder.getJWKS('example.com');

            // Second call - from cache
            mockCache.get.mockReturnValueOnce(jwk);
            await builder.getJWKS('example.com');

            expect(mockCryptoEngine.pemToJWK).toHaveBeenCalledTimes(1);
        });
    });

    describe('error handling', () => {
        it('should propagate loader errors', async () => {
            // Test: Errors from loader bubble up
            const error = new Error('Failed to load public keys');
            mockLoader.getPublicKeyMap.mockRejectedValue(error);

            await expect(builder.getJWKS('example.com')).rejects.toThrow('Failed to load public keys');
        });

        it('should propagate PEM to JWK conversion errors', async () => {
            // Test: Errors from cryptoEngine bubble up
            const error = new Error('Invalid PEM format');
            mockLoader.getPublicKeyMap.mockResolvedValue({ 'kid-1': 'invalid-pem' });
            mockCache.get.mockReturnValue(undefined);
            mockCryptoEngine.pemToJWK.mockRejectedValue(error);

            await expect(builder.getJWKS('example.com')).rejects.toThrow('Invalid PEM format');
        });

        it('should handle cache access errors gracefully', async () => {
            // Test: Cache errors are handled
            mockLoader.getPublicKeyMap.mockResolvedValue({ 'kid-1': 'pem' });
            mockCache.get.mockImplementation(() => {
                throw new Error('Cache read error');
            });

            await expect(builder.getJWKS('example.com')).rejects.toThrow('Cache read error');
        });

        it('should handle cache write errors gracefully', async () => {
            // Test: Cache set errors are handled
            mockLoader.getPublicKeyMap.mockResolvedValue({ 'kid-1': 'pem' });
            mockCache.get.mockReturnValue(undefined);
            mockCryptoEngine.pemToJWK.mockResolvedValue({ kty: 'RSA' });
            mockCache.set.mockImplementation(() => {
                throw new Error('Cache write error');
            });

            await expect(builder.getJWKS('example.com')).rejects.toThrow('Cache write error');
        });
    });

    describe('integration scenarios', () => {
        it('should build complete JWKS for domain with multiple keys', async () => {
            // Test: End-to-end JWKS building
            mockLoader.getPublicKeyMap.mockResolvedValue({
                'example-20260109-100000-abc': 'pem-1',
                'example-20260109-110000-def': 'pem-2',
                'example-20260109-120000-ghi': 'pem-3'
            });
            mockCache.get.mockReturnValue(undefined);
            mockCryptoEngine.pemToJWK
                .mockResolvedValueOnce({ kty: 'RSA', kid: 'example-20260109-100000-abc', use: 'sig' })
                .mockResolvedValueOnce({ kty: 'RSA', kid: 'example-20260109-110000-def', use: 'sig' })
                .mockResolvedValueOnce({ kty: 'RSA', kid: 'example-20260109-120000-ghi', use: 'sig' });

            const result = await builder.getJWKS('example.com');

            expect(result).toEqual({
                keys: [
                    { kty: 'RSA', kid: 'example-20260109-100000-abc', use: 'sig' },
                    { kty: 'RSA', kid: 'example-20260109-110000-def', use: 'sig' },
                    { kty: 'RSA', kid: 'example-20260109-120000-ghi', use: 'sig' }
                ]
            });
        });

        it('should handle real RSA JWK structure', async () => {
            // Test: Realistic JWK with all RSA properties
            const realJWK = {
                kty: 'RSA',
                kid: 'example-20260109-133000-abc123',
                use: 'sig',
                alg: 'RS256',
                n: 'u1SU1LfVLPHCozMxH2Mo4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0_IzW7yWR7QkrmBL7jTKEn5u',
                e: 'AQAB'
            };

            mockLoader.getPublicKeyMap.mockResolvedValue({ [realJWK.kid]: 'pem' });
            mockCache.get.mockReturnValue(undefined);
            mockCryptoEngine.pemToJWK.mockResolvedValue(realJWK);

            const result = await builder.getJWKS('example.com');

            expect(result.keys[0]).toEqual(realJWK);
            expect(result.keys[0]).toHaveProperty('n');
            expect(result.keys[0]).toHaveProperty('e');
        });

        it('should handle concurrent JWKS requests', async () => {
            // Test: Multiple parallel requests
            mockLoader.getPublicKeyMap.mockResolvedValue({ 'kid-1': 'pem' });
            mockCache.get.mockReturnValue(undefined);
            mockCryptoEngine.pemToJWK.mockResolvedValue({ kty: 'RSA', kid: 'kid-1' });

            const results = await Promise.all([
                builder.getJWKS('domain1.com'),
                builder.getJWKS('domain2.com'),
                builder.getJWKS('domain3.com')
            ]);

            expect(results).toHaveLength(3);
            results.forEach(result => {
                expect(result).toHaveProperty('keys');
            });
        });

        it('should work with minimal valid dependencies', async () => {
            // Test: Builder works with basic implementations
            const minimalBuilder = new JwksBuilder(
                new Map(),
                { getPublicKeyMap: async () => ({ 'test-kid': 'pem' }) },
                { pemToJWK: async (pem, kid) => ({ kty: 'RSA', kid }) }
            );

            const result = await minimalBuilder.getJWKS('test.com');

            expect(result.keys).toEqual([{ kty: 'RSA', kid: 'test-kid' }]);
        });
    });
});
