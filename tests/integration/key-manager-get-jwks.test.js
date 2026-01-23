/**
 * Integration Test: KeyManager getJwks() Method
 * 
 * Tests keyManager.getJwks(domain)
 * 
 * RULES FOLLOWED:
 * - Imports ONLY from domain/key-manager/index.js (ManagerFactory)
 * - Creates KeyManager via ManagerFactory with DI
 * - Passes outsider dependencies: pathService, cryptoEngine, lockRepo, policyRepo, Cache, activeKidStore
 * - Uses REAL implementations (no mocks except DB/Redis)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { ManagerFactory } from '../../src/domain/key-manager/index.js';
import { setupTestEnvironment, cleanupTestEnvironment, createTestKeyPaths } from './helpers/testSetup.js';
import { createTestInfrastructure, clearFactorySingletons } from './helpers/infrastructure.js';

describe('Integration: KeyManager getJwks() Method', () => {
    let testPaths;
    let keyManager;
    let infrastructure;

    beforeEach(async () => {
        await setupTestEnvironment();
        testPaths = createTestKeyPaths();

        clearFactorySingletons();

        infrastructure = createTestInfrastructure(testPaths);

        const factory = new ManagerFactory({
            pathService: infrastructure.pathService,
            cryptoEngine: infrastructure.cryptoEngine,
            lockRepo: infrastructure.lockRepo,
            policyRepo: infrastructure.policyRepo,
            Cache: infrastructure.Cache,
            ActiveKidCache: infrastructure.ActiveKidCache
        });

        keyManager = await factory.create();
    });

    afterEach(async () => {
        await cleanupTestEnvironment();
        infrastructure.ActiveKidCache.clearAll();
    });

    describe('Basic JWKS Generation', () => {
        it('should generate JWKS with correct structure', async () => {
            const domain = 'JWKS_TEST';

            const { kid } = await keyManager.initialSetupDomain(domain);
            const jwks = await keyManager.getJwks(domain);

            expect(jwks).toBeDefined();
            expect(jwks.keys).toBeDefined();
            expect(Array.isArray(jwks.keys)).toBe(true);
            expect(jwks.keys.length).toBeGreaterThan(0);
        });

        it('should include correct JWK properties', async () => {
            const domain = 'JWK_PROPS_TEST';

            const { kid } = await keyManager.initialSetupDomain(domain);
            const jwks = await keyManager.getJwks(domain);

            const jwk = jwks.keys[0];
            expect(jwk.kty).toBe('RSA');
            expect(jwk.use).toBe('sig');
            expect(jwk.alg).toBe('RS256');
            expect(jwk.kid).toBe(kid);
            expect(jwk.n).toBeDefined();
            expect(jwk.e).toBeDefined();
        });

        it('should not include private key components', async () => {
            const domain = 'NO_PRIVATE_TEST';

            await keyManager.initialSetupDomain(domain);
            const jwks = await keyManager.getJwks(domain);

            const jwk = jwks.keys[0];
            expect(jwk.d).toBeUndefined();
            expect(jwk.p).toBeUndefined();
            expect(jwk.q).toBeUndefined();
        });
    });

    describe('Domain Normalization', () => {
        it('should normalize domain names', async () => {
            const domain = 'lowercase_jwks';

            await keyManager.initialSetupDomain(domain);

            const jwks1 = await keyManager.getJwks('lowercase_jwks');
            const jwks2 = await keyManager.getJwks('LOWERCASE_JWKS');

            expect(jwks1.keys[0].kid).toBe(jwks2.keys[0].kid);
        });
    });

    describe('Error Handling', () => {
        it('should throw error for invalid domain', async () => {
            await expect(keyManager.getJwks(null))
                .rejects
                .toThrow(/Domain must be a non-empty string/i);

            await expect(keyManager.getJwks(''))
                .rejects
                .toThrow(/Domain must be a non-empty string/i);
        });

        it('should throw error for domain with no keys directory', async () => {
            const domain = 'NO_KEYS_DOMAIN';

            await expect(keyManager.getJwks(domain))
                .rejects
                .toThrow(/ENOENT|no such file or directory/i);
        });
    });

    describe('JWK Verification', () => {
        it('should generate JWK that can verify JWT signatures', async () => {
            const domain = 'VERIFY_WITH_JWK';
            const payload = { test: 'data' };

            await keyManager.initialSetupDomain(domain);
            const jwt = await keyManager.sign(domain, payload);
            const jwks = await keyManager.getJwks(domain);
            const jwk = jwks.keys[0];

            const publicKey = crypto.createPublicKey({
                key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
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
});
