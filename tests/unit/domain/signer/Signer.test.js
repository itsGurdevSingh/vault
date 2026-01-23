import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Signer } from '../../../../src/domain/key-manager/modules/signer/Signer.js';

describe('Signer', () => {
    let mockCache;
    let mockKeyResolver;
    let mockCryptoEngine;
    let mockLogger;
    let signer;

    beforeEach(() => {
        // Reset all mocks before each test
        mockCache = new Map();
        const originalGet = mockCache.get.bind(mockCache);
        const originalSet = mockCache.set.bind(mockCache);
        mockCache.get = vi.fn(originalGet);
        mockCache.set = vi.fn(originalSet);

        mockKeyResolver = {
            getActiveKid: vi.fn(),
            getSigningKey: vi.fn()
        };

        mockCryptoEngine = {
            buildTokenParts: vi.fn(),
            sign: vi.fn(),
            importPrivateKey: vi.fn()
        };

        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };

        signer = new Signer(mockCache, mockKeyResolver, mockCryptoEngine, { logger: mockLogger });
    });

    describe('constructor', () => {
        it('should initialize with all required dependencies', () => {
            // Test: Verify all dependencies are stored
            expect(signer.cache).toBe(mockCache);
            expect(signer.keyResolver).toBe(mockKeyResolver);
            expect(signer.cryptoEngine).toBe(mockCryptoEngine);
        });

        it('should set default TTL to 30 days if not provided', () => {
            // Test: Default TTL is 30 days in seconds
            const s = new Signer(mockCache, mockKeyResolver, mockCryptoEngine);

            expect(s.defaultTTL).toBe(30 * 24 * 60 * 60);
        });

        it('should use provided defaultTTL from options', () => {
            // Test: Custom TTL from options
            const s = new Signer(mockCache, mockKeyResolver, mockCryptoEngine, { defaultTTL: 3600 });

            expect(s.defaultTTL).toBe(3600);
        });

        it('should set default maxPayloadBytes to 4KB if not provided', () => {
            // Test: Default max payload is 4KB
            const s = new Signer(mockCache, mockKeyResolver, mockCryptoEngine);

            expect(s.maxPayloadBytes).toBe(4 * 1024);
        });

        it('should use provided maxPayloadBytes from options', () => {
            // Test: Custom max payload from options
            const s = new Signer(mockCache, mockKeyResolver, mockCryptoEngine, { maxPayloadBytes: 8192 });

            expect(s.maxPayloadBytes).toBe(8192);
        });

        it('should use console as default logger if not provided', () => {
            // Test: Console fallback for logger
            const s = new Signer(mockCache, mockKeyResolver, mockCryptoEngine);

            expect(s.logger).toBe(console);
        });

        it('should use provided logger from options', () => {
            // Test: Custom logger injection
            const customLogger = { info: vi.fn(), error: vi.fn() };
            const s = new Signer(mockCache, mockKeyResolver, mockCryptoEngine, { logger: customLogger });

            expect(s.logger).toBe(customLogger);
        });
    });

    describe('_validateInput', () => {
        it('should not throw for valid domain and payload', () => {
            // Test: Valid inputs pass validation
            expect(() => {
                signer._validateInput('test.local', { sub: 'user123' });
            }).not.toThrow();
        });

        it('should throw if domain is missing', () => {
            // Test: Domain is required
            expect(() => {
                signer._validateInput(null, { sub: 'user123' });
            }).toThrow('domain required string');
        });

        it('should throw if domain is not a string', () => {
            // Test: Domain must be string type
            expect(() => {
                signer._validateInput(123, { sub: 'user123' });
            }).toThrow('domain required string');
        });

        it('should throw if payload is missing', () => {
            // Test: Payload is required
            expect(() => {
                signer._validateInput('test.local', null);
            }).toThrow('payload must be plain object');
        });

        it('should throw if payload is not an object', () => {
            // Test: Payload must be object
            expect(() => {
                signer._validateInput('test.local', 'not-an-object');
            }).toThrow('payload must be plain object');
        });

        it('should throw if payload is an array', () => {
            // Test: Arrays are not valid payloads
            expect(() => {
                signer._validateInput('test.local', ['array']);
            }).toThrow('payload must be plain object');
        });
    });

    describe('_validateTTL', () => {
        it('should not throw for positive number', () => {
            // Test: Valid TTL passes
            expect(() => {
                signer._validateTTL(3600);
            }).not.toThrow();
        });

        it('should throw if TTL is not a number', () => {
            // Test: TTL must be numeric
            expect(() => {
                signer._validateTTL('3600');
            }).toThrow('ttlSeconds must be a positive number');
        });

        it('should throw if TTL is zero', () => {
            // Test: TTL must be positive
            expect(() => {
                signer._validateTTL(0);
            }).toThrow('ttlSeconds must be a positive number');
        });

        it('should throw if TTL is negative', () => {
            // Test: Negative TTL not allowed
            expect(() => {
                signer._validateTTL(-100);
            }).toThrow('ttlSeconds must be a positive number');
        });
    });

    describe('_getActiveKid', () => {
        it('should return active KID from resolver', async () => {
            // Test: Active KID is fetched from resolver
            mockKeyResolver.getActiveKid.mockResolvedValue('test-20260109-133000-abc123');

            const kid = await signer._getActiveKid('test.local');

            expect(kid).toBe('test-20260109-133000-abc123');
            expect(mockKeyResolver.getActiveKid).toHaveBeenCalledWith('test.local');
        });

        it('should throw if no active KID exists', async () => {
            // Test: Error when no active key
            mockKeyResolver.getActiveKid.mockResolvedValue(null);

            await expect(signer._getActiveKid('test.local')).rejects.toThrow(
                'No active signing KID for domain "test.local"'
            );
        });
    });

    describe('_getCryptoKeyForKid', () => {
        it('should return cached CryptoKey if available', async () => {
            // Test: Cache hit returns cached key
            const cachedKey = { type: 'private', algorithm: 'RS256' };
            mockCache.set('test-kid', cachedKey);

            const result = await signer._getCryptoKeyForKid('test-kid');

            expect(result).toBe(cachedKey);
            expect(mockKeyResolver.getSigningKey).not.toHaveBeenCalled();
        });

        it('should load and cache CryptoKey on cache miss', async () => {
            // Test: Cache miss triggers load and caching
            const privateKeyPem = '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----';
            const cryptoKey = { type: 'private' };

            mockKeyResolver.getSigningKey.mockResolvedValue({ privateKey: privateKeyPem });
            mockCryptoEngine.importPrivateKey.mockResolvedValue(cryptoKey);

            const result = await signer._getCryptoKeyForKid('new-kid');

            expect(result).toBe(cryptoKey);
            expect(mockCache.set).toHaveBeenCalledWith('new-kid', cryptoKey);
        });

        it('should log debug message when caching key', async () => {
            // Test: Cache operation is logged
            mockKeyResolver.getSigningKey.mockResolvedValue({
                privateKey: '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----'
            });
            mockCryptoEngine.importPrivateKey.mockResolvedValue({ type: 'private' });

            await signer._getCryptoKeyForKid('new-kid');

            expect(mockLogger.debug).toHaveBeenCalled();
        });

        it('should throw and log error if key import fails', async () => {
            // Test: Import errors are logged and propagated
            const error = new Error('Invalid key format');
            mockKeyResolver.getSigningKey.mockResolvedValue({ privateKey: 'invalid-pem' });
            mockCryptoEngine.importPrivateKey.mockRejectedValue(error);

            await expect(signer._getCryptoKeyForKid('bad-kid')).rejects.toThrow('Failed to import private key');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('sign', () => {
        beforeEach(() => {
            // Setup default mocks for successful signing
            mockKeyResolver.getActiveKid.mockResolvedValue('test-20260109-133000-abc123');
            mockKeyResolver.getSigningKey.mockResolvedValue({
                privateKey: '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----'
            });
            mockCryptoEngine.importPrivateKey.mockResolvedValue({ type: 'private' });
            mockCryptoEngine.buildTokenParts.mockReturnValue({
                encodedHeader: 'header',
                encodedPayload: 'payload',
                signingInput: 'header.payload'
            });
            mockCryptoEngine.sign.mockResolvedValue('signature');
        });

        it('should validate input before signing', async () => {
            // Test: Input validation happens first
            await expect(
                signer.sign(null, { sub: 'user' })
            ).rejects.toThrow('domain required string');
        });

        it('should use default TTL if not provided', async () => {
            // Test: Default TTL is applied
            await signer.sign('test.local', { sub: 'user123' });

            expect(mockCryptoEngine.buildTokenParts).toHaveBeenCalledWith(
                { sub: 'user123' },
                'test-20260109-133000-abc123',
                expect.objectContaining({
                    ttlSeconds: 30 * 24 * 60 * 60
                })
            );
        });

        it('should use provided TTL from options', async () => {
            // Test: Custom TTL overrides default
            await signer.sign('test.local', { sub: 'user123' }, { ttlSeconds: 3600 });

            expect(mockCryptoEngine.buildTokenParts).toHaveBeenCalledWith(
                { sub: 'user123' },
                'test-20260109-133000-abc123',
                expect.objectContaining({
                    ttlSeconds: 3600
                })
            );
        });

        it('should validate custom TTL', async () => {
            // Test: Invalid TTL throws error
            await expect(
                signer.sign('test.local', { sub: 'user' }, { ttlSeconds: -100 })
            ).rejects.toThrow('ttlSeconds must be a positive number');
        });

        it('should get active KID for domain', async () => {
            // Test: Active KID is resolved
            await signer.sign('test.local', { sub: 'user123' });

            expect(mockKeyResolver.getActiveKid).toHaveBeenCalledWith('test.local');
        });

        it('should build token parts with payload and KID', async () => {
            // Test: Token parts are built correctly
            const payload = { sub: 'user123', role: 'admin' };
            await signer.sign('test.local', payload);

            expect(mockCryptoEngine.buildTokenParts).toHaveBeenCalledWith(
                payload,
                'test-20260109-133000-abc123',
                expect.any(Object)
            );
        });

        it('should pass additional claims to buildTokenParts', async () => {
            // Test: Additional claims are forwarded
            const additionalClaims = { aud: 'api.test.local' };
            await signer.sign('test.local', { sub: 'user' }, { additionalClaims });

            expect(mockCryptoEngine.buildTokenParts).toHaveBeenCalledWith(
                { sub: 'user' },
                'test-20260109-133000-abc123',
                expect.objectContaining({
                    additionalClaims
                })
            );
        });

        it('should get CryptoKey for signing', async () => {
            // Test: CryptoKey is retrieved (from cache or loaded)
            await signer.sign('test.local', { sub: 'user123' });

            // Should check cache or load key
            expect(mockCache.get).toHaveBeenCalled();
        });

        it('should sign token parts with CryptoKey', async () => {
            // Test: Signing happens with correct inputs
            await signer.sign('test.local', { sub: 'user123' });

            expect(mockCryptoEngine.sign).toHaveBeenCalledWith(
                expect.any(Object),
                'header.payload'
            );
        });

        it('should return complete JWT token', async () => {
            // Test: Token format is header.payload.signature
            const token = await signer.sign('test.local', { sub: 'user123' });

            expect(token).toBe('header.payload.signature');
        });

        it('should handle multiple signing requests for same domain', async () => {
            // Test: Subsequent requests use cached key
            await signer.sign('test.local', { sub: 'user1' });
            await signer.sign('test.local', { sub: 'user2' });

            // First call loads, second uses cache
            expect(mockCryptoEngine.importPrivateKey).toHaveBeenCalledTimes(1);
            expect(mockCryptoEngine.sign).toHaveBeenCalledTimes(2);
        });

        it('should handle different domains independently', async () => {
            // Test: Each domain gets its own key
            mockKeyResolver.getActiveKid
                .mockResolvedValueOnce('domain1-kid')
                .mockResolvedValueOnce('domain2-kid');

            await signer.sign('domain1.local', { sub: 'user1' });
            await signer.sign('domain2.local', { sub: 'user2' });

            expect(mockKeyResolver.getActiveKid).toHaveBeenCalledWith('domain1.local');
            expect(mockKeyResolver.getActiveKid).toHaveBeenCalledWith('domain2.local');
        });
    });

    describe('_convertToCryptoKey', () => {
        it('should convert PEM to CryptoKey using cryptoEngine', async () => {
            // Test: Conversion delegates to cryptoEngine
            const pem = '-----BEGIN PRIVATE KEY-----\nKEY_DATA\n-----END PRIVATE KEY-----';
            const cryptoKey = { type: 'private', algorithm: 'RS256' };

            mockCryptoEngine.importPrivateKey.mockResolvedValue(cryptoKey);

            const result = await signer._convertToCryptoKey(pem);

            expect(result).toBe(cryptoKey);
            expect(mockCryptoEngine.importPrivateKey).toHaveBeenCalledWith(pem);
        });

        it('should propagate conversion errors', async () => {
            // Test: Conversion errors bubble up
            const error = new Error('Invalid PEM format');
            mockCryptoEngine.importPrivateKey.mockRejectedValue(error);

            await expect(
                signer._convertToCryptoKey('invalid-pem')
            ).rejects.toThrow('Invalid PEM format');
        });
    });

    describe('error handling', () => {
        it('should handle resolver errors gracefully', async () => {
            // Test: Resolver errors are propagated
            const error = new Error('Resolver connection failed');
            mockKeyResolver.getActiveKid.mockRejectedValue(error);

            await expect(
                signer.sign('example.com', { sub: 'user' })
            ).rejects.toThrow('Resolver connection failed');
        });

        it('should handle cryptoEngine build errors', async () => {
            // Test: Token building errors are propagated
            const error = new Error('Invalid payload format');
            mockKeyResolver.getActiveKid.mockResolvedValue('test-kid');
            mockCryptoEngine.buildTokenParts.mockImplementation(() => {
                throw error;
            });

            await expect(
                signer.sign('example.com', { sub: 'user' })
            ).rejects.toThrow('Invalid payload format');
        });

        it('should handle signing errors', async () => {
            // Test: Signing errors are propagated
            const error = new Error('Signing failed');
            mockKeyResolver.getActiveKid.mockResolvedValue('test-kid');
            mockCache.set('test-kid', { type: 'private' });
            mockCryptoEngine.buildTokenParts.mockReturnValue({
                encodedHeader: 'h',
                encodedPayload: 'p',
                signingInput: 'h.p'
            });
            mockCryptoEngine.sign.mockRejectedValue(error);

            await expect(
                signer.sign('example.com', { sub: 'user' })
            ).rejects.toThrow('Signing failed');
        });
    });

    describe('integration scenarios', () => {
        it('should complete full signing flow successfully', async () => {
            // Test: End-to-end token signing
            mockKeyResolver.getActiveKid.mockResolvedValue('prod-20260109-133000-xyz');
            mockKeyResolver.getSigningKey.mockResolvedValue({
                privateKey: '-----BEGIN PRIVATE KEY-----\nPROD_KEY\n-----END PRIVATE KEY-----'
            });
            mockCryptoEngine.importPrivateKey.mockResolvedValue({ type: 'private', alg: 'RS256' });
            mockCryptoEngine.buildTokenParts.mockReturnValue({
                encodedHeader: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9',
                encodedPayload: 'eyJzdWIiOiJ1c2VyMTIzIn0',
                signingInput: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0'
            });
            mockCryptoEngine.sign.mockResolvedValue('signature_base64url');

            const token = await signer.sign('prod.local', { sub: 'user123' });

            expect(token).toBe('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.signature_base64url');
        });

        it('should handle rapid concurrent signing requests', async () => {
            // Test: Multiple parallel sign requests
            mockKeyResolver.getActiveKid.mockResolvedValue('test-kid');
            mockCache.set('test-kid', { type: 'private' });
            mockCryptoEngine.buildTokenParts.mockReturnValue({
                encodedHeader: 'h',
                encodedPayload: 'p',
                signingInput: 'h.p'
            });
            mockCryptoEngine.sign.mockResolvedValue('sig');

            const tokens = await Promise.all([
                signer.sign('test.local', { sub: 'user1' }),
                signer.sign('test.local', { sub: 'user2' }),
                signer.sign('test.local', { sub: 'user3' })
            ]);

            expect(tokens).toHaveLength(3);
            tokens.forEach(token => {
                expect(token).toBe('h.p.sig');
            });
        });

        it('should work with minimal valid configuration', async () => {
            // Test: Signer works with basic setup
            const minimalSigner = new Signer(
                new Map(),
                {
                    getActiveKid: async () => 'minimal-kid',
                    getSigningKey: async () => ({ privateKey: 'pem' })
                },
                {
                    importPrivateKey: async () => ({ type: 'private' }),
                    buildTokenParts: () => ({ encodedHeader: 'h', encodedPayload: 'p', signingInput: 'h.p' }),
                    sign: async () => 'sig'
                }
            );

            const token = await minimalSigner.sign('test.local', { sub: 'user' });

            expect(token).toBe('h.p.sig');
        });
    });
});
