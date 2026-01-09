import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { CryptoEngine } from '../../../../src/infrastructure/cryptoEngine/CryptoEngine.js';
import { CryptoConfig } from '../../../../src/infrastructure/cryptoEngine/cryptoConfig.js';
import { pemToArrayBuffer, base64UrlEncode } from '../../../../src/infrastructure/cryptoEngine/utils.js';

describe('CryptoEngine', () => {
    let cryptoEngine;
    let mockTokenBuilder;
    let mockKidFactory;
    let mockUtils;

    beforeEach(() => {
        mockUtils = {
            pemToArrayBuffer, // Use real implementation
            base64UrlEncode // Use real implementation
        };

        mockTokenBuilder = {
            build: vi.fn((payload, kid, options, config) => ({
                encodedHeader: 'mockHeader',
                encodedPayload: 'mockPayload',
                signingInput: 'mockHeader.mockPayload',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600
            }))
        };

        mockKidFactory = {
            generate: vi.fn((domain) => `${domain}-20260109-143022-ABCD1234`),
            getInfo: vi.fn((kid) => {
                const parts = kid.split('-');
                return parts.length >= 4 ? {
                    domain: parts[0],
                    date: parts[1],
                    time: parts[2],
                    timestamp: `${parts[1]}-${parts[2]}`,
                    uniqueId: parts[3]
                } : null;
            })
        };

        cryptoEngine = new CryptoEngine({
            cryptoModule: crypto,
            config: CryptoConfig,
            utils: mockUtils,
            tokenBuilder: mockTokenBuilder,
            kidFactory: mockKidFactory
        });
    });

    describe('constructor', () => {
        it('should initialize with injected dependencies', () => {
            expect(cryptoEngine.crypto).toBe(crypto);
            expect(cryptoEngine.config).toBe(CryptoConfig);
            expect(cryptoEngine.utils).toBe(mockUtils);
            expect(cryptoEngine.tokenBuilder).toBe(mockTokenBuilder);
            expect(cryptoEngine.kidFactory).toBe(mockKidFactory);
        });
    });

    describe('generateKeyPair', () => {
        it('should generate RSA key pair', async () => {
            const result = await cryptoEngine.generateKeyPair();

            expect(result).toHaveProperty('publicKey');
            expect(result).toHaveProperty('privateKey');
            expect(result.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
            expect(result.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
        });

        it('should use configured modulus length', async () => {
            const result = await cryptoEngine.generateKeyPair();

            // The key should be generated with 4096 bits
            expect(result.publicKey.length).toBeGreaterThan(500);
            expect(result.privateKey.length).toBeGreaterThan(1500);
        });

        it('should generate different keys on each call', async () => {
            const result1 = await cryptoEngine.generateKeyPair();
            const result2 = await cryptoEngine.generateKeyPair();

            expect(result1.privateKey).not.toBe(result2.privateKey);
            expect(result1.publicKey).not.toBe(result2.publicKey);
        });

        it('should generate valid PEM format', async () => {
            const result = await cryptoEngine.generateKeyPair();

            expect(result.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----\n/);
            expect(result.publicKey).toMatch(/\n-----END PUBLIC KEY-----\n$/);
            expect(result.privateKey).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
            expect(result.privateKey).toMatch(/\n-----END PRIVATE KEY-----\n$/);
        });
    });

    describe('pemToJWK', () => {
        it('should convert PEM to JWK format', async () => {
            const keyPair = await cryptoEngine.generateKeyPair();
            const kid = 'test-kid';

            const jwk = await cryptoEngine.pemToJWK(keyPair.publicKey, kid);

            expect(jwk).toHaveProperty('kty', 'RSA');
            expect(jwk).toHaveProperty('n'); // modulus
            expect(jwk).toHaveProperty('e'); // exponent
            expect(jwk).toHaveProperty('kid', kid);
            expect(jwk).toHaveProperty('use', 'sig');
            expect(jwk).toHaveProperty('alg', 'RS256');
        });

        it('should handle provided KID', async () => {
            const keyPair = await cryptoEngine.generateKeyPair();
            const kid = 'custom-kid-123';

            const jwk = await cryptoEngine.pemToJWK(keyPair.publicKey, kid);

            expect(jwk.kid).toBe(kid);
        });

        it('should produce valid JWK structure', async () => {
            const keyPair = await cryptoEngine.generateKeyPair();
            const jwk = await cryptoEngine.pemToJWK(keyPair.publicKey, 'test-kid');

            // JWK should have base64url encoded components
            expect(typeof jwk.n).toBe('string');
            expect(typeof jwk.e).toBe('string');
            expect(jwk.n.length).toBeGreaterThan(100);
        });
    });

    describe('importPrivateKey', () => {
        it('should import private key as CryptoKey', async () => {
            const keyPair = await cryptoEngine.generateKeyPair();

            const cryptoKey = await cryptoEngine.importPrivateKey(keyPair.privateKey);

            expect(cryptoKey).toBeDefined();
            expect(cryptoKey.type).toBe('private');
            expect(cryptoKey.algorithm.name).toBe('RSASSA-PKCS1-v1_5');
        });

        it('should use configured algorithm', async () => {
            const keyPair = await cryptoEngine.generateKeyPair();

            const cryptoKey = await cryptoEngine.importPrivateKey(keyPair.privateKey);

            expect(cryptoKey.algorithm.name).toBe(CryptoConfig.ALG_NAME);
            expect(cryptoKey.algorithm.hash.name).toBe(CryptoConfig.HASH_NAME);
        });

        it('should mark key as non-extractable', async () => {
            const keyPair = await cryptoEngine.generateKeyPair();

            const cryptoKey = await cryptoEngine.importPrivateKey(keyPair.privateKey);

            expect(cryptoKey.extractable).toBe(false);
        });

        it('should set correct usages', async () => {
            const keyPair = await cryptoEngine.generateKeyPair();

            const cryptoKey = await cryptoEngine.importPrivateKey(keyPair.privateKey);

            expect(cryptoKey.usages).toContain('sign');
        });
    });

    describe('sign', () => {
        it('should sign data with private key', async () => {
            const keyPair = await cryptoEngine.generateKeyPair();
            const cryptoKey = await cryptoEngine.importPrivateKey(keyPair.privateKey);
            const data = 'test data to sign';

            const signature = await cryptoEngine.sign(cryptoKey, data);

            expect(typeof signature).toBe('string');
            expect(signature.length).toBeGreaterThan(0);
        });

        it('should produce base64url encoded signature', async () => {
            const keyPair = await cryptoEngine.generateKeyPair();
            const cryptoKey = await cryptoEngine.importPrivateKey(keyPair.privateKey);

            const signature = await cryptoEngine.sign(cryptoKey, 'test data');

            // Base64url should not contain +, /, or =
            expect(signature).not.toMatch(/[+/=]/);
        });

        it('should produce different signatures for different data', async () => {
            const keyPair = await cryptoEngine.generateKeyPair();
            const cryptoKey = await cryptoEngine.importPrivateKey(keyPair.privateKey);

            const sig1 = await cryptoEngine.sign(cryptoKey, 'data1');
            const sig2 = await cryptoEngine.sign(cryptoKey, 'data2');

            expect(sig1).not.toBe(sig2);
        });

        it('should produce consistent signatures for same data and key', async () => {
            const keyPair = await cryptoEngine.generateKeyPair();
            const cryptoKey = await cryptoEngine.importPrivateKey(keyPair.privateKey);
            const data = 'consistent data';

            const sig1 = await cryptoEngine.sign(cryptoKey, data);
            const sig2 = await cryptoEngine.sign(cryptoKey, data);

            expect(sig1).toBe(sig2);
        });
    });

    describe('generateKID', () => {
        it('should delegate to KIDFactory', () => {
            const domain = 'testdomain';

            const kid = cryptoEngine.generateKID(domain);

            expect(mockKidFactory.generate).toHaveBeenCalledWith(domain);
            expect(kid).toBe('testdomain-20260109-143022-ABCD1234');
        });

        it('should pass domain correctly', () => {
            const domain = 'my-custom-domain';

            cryptoEngine.generateKID(domain);

            expect(mockKidFactory.generate).toHaveBeenCalledWith(domain);
        });
    });

    describe('getInfo', () => {
        it('should delegate to KIDFactory', () => {
            const kid = 'testdomain-20260109-143022-ABCD1234';

            const info = cryptoEngine.getInfo(kid);

            expect(mockKidFactory.getInfo).toHaveBeenCalledWith(kid);
            expect(info).toHaveProperty('domain', 'testdomain');
        });

        it('should return parsed info', () => {
            const kid = 'testdomain-20260109-143022-ABCD1234';

            const info = cryptoEngine.getInfo(kid);

            expect(info.domain).toBe('testdomain');
            expect(info.date).toBe('20260109');
            expect(info.time).toBe('143022');
            expect(info.uniqueId).toBe('ABCD1234');
        });
    });

    describe('buildTokenParts', () => {
        it('should delegate to TokenBuilder', () => {
            const payload = { sub: 'user123' };
            const kid = 'test-kid';
            const options = { ttlSeconds: 3600 };

            cryptoEngine.buildTokenParts(payload, kid, options);

            expect(mockTokenBuilder.build).toHaveBeenCalledWith(
                payload,
                kid,
                options,
                { maxPayloadBytes: CryptoConfig.MAX_PAYLOAD_BYTES }
            );
        });

        it('should return token parts', () => {
            const payload = { sub: 'user123' };
            const kid = 'test-kid';

            const result = cryptoEngine.buildTokenParts(payload, kid);

            expect(result).toHaveProperty('encodedHeader');
            expect(result).toHaveProperty('encodedPayload');
            expect(result).toHaveProperty('signingInput');
        });

        it('should pass max payload bytes from config', () => {
            const payload = { sub: 'user123' };
            const kid = 'test-kid';

            cryptoEngine.buildTokenParts(payload, kid);

            const call = mockTokenBuilder.build.mock.calls[0];
            expect(call[0]).toEqual(payload);
            expect(call[1]).toBe(kid);
            expect(call[2]).toBeUndefined(); // options defaults to undefined
            expect(call[3]).toEqual({ maxPayloadBytes: CryptoConfig.MAX_PAYLOAD_BYTES });
        });
    });

    describe('pemToArrayBuffer utility method', () => {
        it('should delegate to utils', () => {
            const pem = '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----';

            const result = cryptoEngine.pemToArrayBuffer(pem);

            expect(result).toBeInstanceOf(ArrayBuffer);
        });
    });

    describe('integration test', () => {
        it('should complete full JWT signing workflow', async () => {
            // Generate key pair
            const keyPair = await cryptoEngine.generateKeyPair();
            expect(keyPair.privateKey).toBeDefined();

            // Generate KID
            const kid = cryptoEngine.generateKID('testdomain');
            expect(kid).toContain('testdomain');

            // Import private key
            const cryptoKey = await cryptoEngine.importPrivateKey(keyPair.privateKey);
            expect(cryptoKey.type).toBe('private');

            // Build token parts
            const parts = cryptoEngine.buildTokenParts({ sub: 'user123' }, kid);
            expect(parts.signingInput).toBeDefined();

            // Sign
            const signature = await cryptoEngine.sign(cryptoKey, parts.signingInput);
            expect(signature).toBeDefined();

            // Convert to JWK
            const jwk = await cryptoEngine.pemToJWK(keyPair.publicKey, kid);
            expect(jwk.kid).toBe(kid);
        });
    });
});
