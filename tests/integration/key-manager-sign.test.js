/**
 * Integration Test: KeyManager sign() Method
 * 
 * Tests keyManager.sign(domain, payload, opts)
 * 
 * RULES FOLLOWED:
 * - Imports ONLY from domain/key-manager/index.js (ManagerFactory)
 * - Creates KeyManager via ManagerFactory.getInstance()
 * - Passes outsider dependencies: pathService, cryptoEngine, lockRepo, policyRepo, Cache, activeKidStore
 * - Uses REAL implementations (no mocks except DB/Redis)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { ManagerFactory } from '../../src/domain/key-manager/index.js';
import { setupTestEnvironment, cleanupTestEnvironment, createTestKeyPaths } from './helpers/testSetup.js';
import { createTestInfrastructure, clearFactorySingletons } from './helpers/infrastructure.js';

describe('Integration: KeyManager sign() Method', () => {
    let testPaths;
    let keyManager;
    let infrastructure;

    beforeEach(async () => {
        await setupTestEnvironment();
        testPaths = createTestKeyPaths();

        // CRITICAL: Clear all factory singletons to prevent stale instances across tests
        clearFactorySingletons();

        // Create outsider dependencies
        infrastructure = createTestInfrastructure(testPaths);

        // Create KeyManager via factory with dependency injection
        const factory = new ManagerFactory({
            pathService: infrastructure.pathService,
            cryptoEngine: infrastructure.cryptoEngine,
            lockRepo: infrastructure.lockRepo,
            policyRepo: infrastructure.policyRepo,
            Cache: infrastructure.Cache,
            activeKidStore: infrastructure.activeKidStore
        });

        keyManager = await factory.create();
    });

    afterEach(async () => {
        await cleanupTestEnvironment();
        infrastructure.activeKidStore.clearAll();
    });

    describe('Basic Signing', () => {
        it('should sign a JWT with default options', async () => {
            const domain = 'USER_SERVICE';
            const payload = { userId: '12345', role: 'admin' };

            // Setup: Generate keys first
            const setupResult = await keyManager.initialSetupDomain(domain);

            // Act: Sign JWT
            const jwt = await keyManager.sign(domain, payload);

            // Assert: JWT structure
            expect(jwt).toBeDefined();
            expect(typeof jwt).toBe('string');
            const parts = jwt.split('.');
            expect(parts).toHaveLength(3);

            // Assert: Header contains correct KID
            const headerB64 = parts[0];
            const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
            expect(header.kid).toBe(setupResult.kid);
            expect(header.alg).toBe('RS256');
            expect(header.typ).toBe('JWT');

            // Assert: Payload contains original claims
            const payloadB64 = parts[1];
            const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
            expect(decodedPayload.userId).toBe('12345');
            expect(decodedPayload.role).toBe('admin');
            expect(decodedPayload.iat).toBeDefined();
            expect(decodedPayload.exp).toBeDefined();

            // Assert: Signature is not empty
            const signature = parts[2];
            expect(signature.length).toBeGreaterThan(0);
        });

        it('should sign JWT with custom TTL', async () => {
            const domain = 'AUTH_SERVICE';
            const payload = { sessionId: 'abc123' };
            const customTTL = 300; // 5 minutes

            // Setup
            await keyManager.initialSetupDomain(domain);

            // Act: Sign with custom TTL
            const jwt = await keyManager.sign(domain, payload, { ttlSeconds: customTTL });

            // Assert: TTL is correctly set
            const parts = jwt.split('.');
            const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            const actualTTL = decodedPayload.exp - decodedPayload.iat;
            expect(actualTTL).toBe(customTTL);
        });

        it('should sign JWT with additional claims', async () => {
            const domain = 'PAYMENT_SERVICE';
            const payload = { transactionId: 'txn_12345' };
            const additionalClaims = {
                issuer: 'payment-gateway',
                audience: 'merchant-api',
                custom: 'value'
            };

            // Setup
            await keyManager.initialSetupDomain(domain);

            // Act: Sign with additional claims
            const jwt = await keyManager.sign(domain, payload, { additionalClaims });

            // Assert: Additional claims are included
            const parts = jwt.split('.');
            const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            expect(decodedPayload.transactionId).toBe('txn_12345');
            expect(decodedPayload.issuer).toBe('payment-gateway');
            expect(decodedPayload.audience).toBe('merchant-api');
            expect(decodedPayload.custom).toBe('value');
        });

        it('should sign JWT with both custom TTL and additional claims', async () => {
            const domain = 'HYBRID_SERVICE';
            const payload = { data: 'test' };
            const ttlSeconds = 600;
            const additionalClaims = { scope: 'read:write' };

            // Setup
            await keyManager.initialSetupDomain(domain);

            // Act
            const jwt = await keyManager.sign(domain, payload, { ttlSeconds, additionalClaims });

            // Assert
            const parts = jwt.split('.');
            const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            expect(decodedPayload.data).toBe('test');
            expect(decodedPayload.scope).toBe('read:write');
            expect(decodedPayload.exp - decodedPayload.iat).toBe(ttlSeconds);
        });
    });

    describe('Domain Normalization', () => {
        it('should normalize lowercase domain names', async () => {
            const domain = 'lowercase_domain';
            const payload = { test: 'data' };

            // Setup with lowercase
            await keyManager.initialSetupDomain(domain);

            // Act: Sign with lowercase domain
            const jwt = await keyManager.sign(domain, payload);

            // Assert: JWT created successfully
            expect(jwt).toBeDefined();
            const parts = jwt.split('.');
            expect(parts).toHaveLength(3);
        });

        it('should normalize mixed case domains consistently', async () => {
            const domain = 'MixedCase';
            const payload = { test: 'data' };

            // Setup
            await keyManager.initialSetupDomain(domain);

            // Act: Sign with same mixed case
            const jwt1 = await keyManager.sign(domain, payload);

            // Act: Sign with different case (should still work after normalization)
            const jwt2 = await keyManager.sign(domain.toUpperCase(), payload);

            // Assert: Both JWTs created
            expect(jwt1).toBeDefined();
            expect(jwt2).toBeDefined();
        });
    });

    describe('Multi-Domain Signing', () => {
        it('should sign JWTs for multiple domains independently', async () => {
            const domain1 = 'SERVICE_A';
            const domain2 = 'SERVICE_B';
            const payload1 = { service: 'A', data: 'alpha' };
            const payload2 = { service: 'B', data: 'beta' };

            // Setup both domains
            const setup1 = await keyManager.initialSetupDomain(domain1);
            const setup2 = await keyManager.initialSetupDomain(domain2);

            // Act: Sign for both domains
            const jwt1 = await keyManager.sign(domain1, payload1);
            const jwt2 = await keyManager.sign(domain2, payload2);

            // Assert: Different KIDs used
            const header1 = JSON.parse(Buffer.from(jwt1.split('.')[0], 'base64url').toString());
            const header2 = JSON.parse(Buffer.from(jwt2.split('.')[0], 'base64url').toString());

            expect(header1.kid).toBe(setup1.kid);
            expect(header2.kid).toBe(setup2.kid);
            expect(header1.kid).not.toBe(header2.kid);

            // Assert: Different payloads
            const payload1Decoded = JSON.parse(Buffer.from(jwt1.split('.')[1], 'base64url').toString());
            const payload2Decoded = JSON.parse(Buffer.from(jwt2.split('.')[1], 'base64url').toString());

            expect(payload1Decoded.service).toBe('A');
            expect(payload2Decoded.service).toBe('B');
        });

        it('should handle concurrent signing requests for different domains', async () => {
            const domains = ['CONCURRENT_A', 'CONCURRENT_B', 'CONCURRENT_C'];
            const payload = { test: 'concurrent' };

            // Setup all domains
            await Promise.all(domains.map(d => keyManager.initialSetupDomain(d)));

            // Act: Sign concurrently
            const jwts = await Promise.all(
                domains.map(d => keyManager.sign(d, payload))
            );

            // Assert: All JWTs created
            expect(jwts).toHaveLength(3);
            jwts.forEach(jwt => {
                expect(jwt).toBeDefined();
                expect(jwt.split('.')).toHaveLength(3);
            });

            // Assert: Different KIDs
            const kids = jwts.map(jwt => {
                const header = JSON.parse(Buffer.from(jwt.split('.')[0], 'base64url').toString());
                return header.kid;
            });
            expect(new Set(kids).size).toBe(3); // All unique
        });
    });

    describe('Signature Verification', () => {
        it('should create verifiable JWT signatures', async () => {
            const domain = 'VERIFY_DOMAIN';
            const payload = { data: 'verify_me' };

            // Setup
            await keyManager.initialSetupDomain(domain);

            // Act: Sign
            const jwt = await keyManager.sign(domain, payload);

            // Assert: Get JWKS and extract public key for verification
            const parts = jwt.split('.');
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
            const jwks = await keyManager.getJwks(domain);

            // Find the key that was used for signing
            const jwk = jwks.keys.find(k => k.kid === header.kid);
            expect(jwk).toBeDefined();

            // Verify signature using Node.js crypto
            const publicKey = crypto.createPublicKey({
                key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
                format: 'jwk'
            });
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(`${parts[0]}.${parts[1]}`);

            const signatureBuffer = Buffer.from(parts[2], 'base64url');
            const isValid = verify.verify(publicKey, signatureBuffer);

            expect(isValid).toBe(true);
        });

        it('should create different signatures for same payload with different keys', async () => {
            const domain1 = 'SIG_TEST_A';
            const domain2 = 'SIG_TEST_B';
            const payload = { identical: 'payload' };

            // Setup
            await keyManager.initialSetupDomain(domain1);
            await keyManager.initialSetupDomain(domain2);

            // Act: Sign same payload with different domain keys
            const jwt1 = await keyManager.sign(domain1, payload);
            const jwt2 = await keyManager.sign(domain2, payload);

            // Assert: Signatures are different
            const sig1 = jwt1.split('.')[2];
            const sig2 = jwt2.split('.')[2];
            expect(sig1).not.toBe(sig2);
        });
    });

    describe('Error Handling', () => {
        it('should throw error when signing without active KID', async () => {
            const domain = 'NO_ACTIVE_KID';
            const payload = { test: 'data' };

            // No initialSetupDomain called

            // Act & Assert
            await expect(keyManager.sign(domain, payload))
                .rejects
                .toThrow(/No active signing KID/i);
        });

        it('should throw error for invalid domain', async () => {
            const payload = { test: 'data' };

            // Act & Assert: null domain
            await expect(keyManager.sign(null, payload))
                .rejects
                .toThrow(/Domain must be a non-empty string/i);

            // Act & Assert: empty domain
            await expect(keyManager.sign('', payload))
                .rejects
                .toThrow(/Domain must be a non-empty string/i);
        });

        it('should throw error for invalid payload', async () => {
            const domain = 'ERROR_DOMAIN';

            // Setup
            await keyManager.initialSetupDomain(domain);

            // Act & Assert: null payload
            await expect(keyManager.sign(domain, null))
                .rejects
                .toThrow(/payload must be plain object/i);

            // Act & Assert: array payload
            await expect(keyManager.sign(domain, [1, 2, 3]))
                .rejects
                .toThrow(/payload must be plain object/i);

            // Act & Assert: string payload
            await expect(keyManager.sign(domain, "string"))
                .rejects
                .toThrow(/payload must be plain object/i);
        });

        it('should throw error for invalid TTL', async () => {
            const domain = 'TTL_ERROR_DOMAIN';
            const payload = { test: 'data' };

            // Setup
            await keyManager.initialSetupDomain(domain);

            // Act & Assert: negative TTL
            await expect(keyManager.sign(domain, payload, { ttlSeconds: -100 }))
                .rejects
                .toThrow(/ttlSeconds must be a positive number/i);

            // Act & Assert: zero TTL
            await expect(keyManager.sign(domain, payload, { ttlSeconds: 0 }))
                .rejects
                .toThrow(/ttlSeconds must be a positive number/i);

            // Act & Assert: string TTL
            await expect(keyManager.sign(domain, payload, { ttlSeconds: "300" }))
                .rejects
                .toThrow(/ttlSeconds must be a positive number/i);
        });
    });

    describe('Cache Behavior', () => {
        it('should cache cryptographic keys for repeated signing', async () => {
            const domain = 'CACHE_TEST';
            const payload1 = { request: 1 };
            const payload2 = { request: 2 };

            // Setup
            await keyManager.initialSetupDomain(domain);

            // Act: Sign multiple times
            const jwt1 = await keyManager.sign(domain, payload1);
            const jwt2 = await keyManager.sign(domain, payload2);

            // Assert: Both JWTs created
            expect(jwt1).toBeDefined();
            expect(jwt2).toBeDefined();

            // Assert: Same KID used (from cache)
            const header1 = JSON.parse(Buffer.from(jwt1.split('.')[0], 'base64url').toString());
            const header2 = JSON.parse(Buffer.from(jwt2.split('.')[0], 'base64url').toString());
            expect(header1.kid).toBe(header2.kid);

            // Assert: Different payloads
            const payload1Decoded = JSON.parse(Buffer.from(jwt1.split('.')[1], 'base64url').toString());
            const payload2Decoded = JSON.parse(Buffer.from(jwt2.split('.')[1], 'base64url').toString());
            expect(payload1Decoded.request).toBe(1);
            expect(payload2Decoded.request).toBe(2);
        });
    });

    describe('Integration with JWKS', () => {
        it('should sign JWT that can be verified using JWKS endpoint', async () => {
            const domain = 'JWKS_INTEGRATION';
            const payload = { user: 'john_doe' };

            // Setup
            const setupResult = await keyManager.initialSetupDomain(domain);

            // Act: Sign JWT
            const jwt = await keyManager.sign(domain, payload);

            // Get JWKS
            const jwks = await keyManager.getJwks(domain);

            // Assert: JWKS contains keys and includes the signing key
            expect(jwks.keys).toBeDefined();
            expect(jwks.keys.length).toBeGreaterThan(0);

            const signingKey = jwks.keys.find(k => k.kid === setupResult.kid);
            expect(signingKey).toBeDefined();
            expect(signingKey.kid).toBe(setupResult.kid);

            // Extract public key from JWKS and verify JWT
            const jwk = signingKey;
            const publicKey = crypto.createPublicKey({
                key: {
                    kty: jwk.kty,
                    n: jwk.n,
                    e: jwk.e,
                },
                format: 'jwk'
            });

            const parts = jwt.split('.');
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(`${parts[0]}.${parts[1]}`);

            const signatureBuffer = Buffer.from(parts[2], 'base64url');
            const isValid = verify.verify(publicKey, signatureBuffer);

            expect(isValid).toBe(true);
        });
    });

    describe('Payload Integrity', () => {
        it('should preserve all payload fields in JWT', async () => {
            const domain = 'PAYLOAD_INTEGRITY';
            const payload = {
                userId: '12345',
                email: 'user@example.com',
                roles: ['admin', 'user'],
                nested: {
                    level1: {
                        level2: 'deep_value'
                    }
                },
                timestamp: Date.now(),
                active: true
            };

            // Setup
            await keyManager.initialSetupDomain(domain);

            // Act: Sign
            const jwt = await keyManager.sign(domain, payload);

            // Assert: Decode and verify all fields
            const parts = jwt.split('.');
            const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            expect(decodedPayload.userId).toBe(payload.userId);
            expect(decodedPayload.email).toBe(payload.email);
            expect(decodedPayload.roles).toEqual(payload.roles);
            expect(decodedPayload.nested).toEqual(payload.nested);
            expect(decodedPayload.timestamp).toBe(payload.timestamp);
            expect(decodedPayload.active).toBe(payload.active);
        });

        it('should not modify original payload object', async () => {
            const domain = 'IMMUTABLE_PAYLOAD';
            const payload = {
                original: 'value',
                count: 42
            };
            const originalCopy = JSON.parse(JSON.stringify(payload));

            // Setup
            await keyManager.initialSetupDomain(domain);

            // Act: Sign
            await keyManager.sign(domain, payload);

            // Assert: Original payload unchanged
            expect(payload).toEqual(originalCopy);
            expect(payload.iat).toBeUndefined();
            expect(payload.exp).toBeUndefined();
        });
    });
});
