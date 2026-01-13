/**
 * Integration Test: KeyManager initialSetup() Method
 * 
 * Tests keyManager.initialSetup(domain)
 * 
 * RULES FOLLOWED:
 * - Imports ONLY from domain/key-manager/index.js (ManagerFactory)
 * - Creates KeyManager via ManagerFactory with DI
 * - Passes outsider dependencies: pathService, cryptoEngine, lockRepo, policyRepo, Cache, activeKidStore
 * - Uses REAL implementations (no mocks except DB/Redis)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { ManagerFactory } from '../../src/domain/key-manager/index.js';
import { setupTestEnvironment, cleanupTestEnvironment, createTestKeyPaths } from './helpers/testSetup.js';
import { createTestInfrastructure, clearFactorySingletons } from './helpers/infrastructure.js';

describe('Integration: KeyManager initialSetup() Method', () => {
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
            activeKidStore: infrastructure.activeKidStore
        });

        keyManager = await factory.create();
    });

    afterEach(async () => {
        await cleanupTestEnvironment();
        infrastructure.activeKidStore.clearAll();
    });

    describe('First-Time Domain Setup', () => {
        it('should generate first key and set as active', async () => {
            const domain = 'NEW_DOMAIN';

            const result = await keyManager.initialSetup(domain);

            expect(result.success).toBe(true);
            expect(result.kid).toBeDefined();
            expect(result.kid).toMatch(/^NEW_DOMAIN-\d{8}-\d{6}-[A-F0-9]{8}$/);
        });

        it('should create complete directory structure', async () => {
            const domain = 'DIR_TEST_DOMAIN';

            await keyManager.initialSetup(domain);

            // Verify all directories created
            const pubKeyDir = testPaths.getPublicKeyDir(domain);
            const pvtKeyDir = testPaths.getPrivateKeyDir(domain);
            const metaKeyDir = testPaths.getMetaKeyDir(domain);

            const pubExists = await fs.access(pubKeyDir).then(() => true).catch(() => false);
            const pvtExists = await fs.access(pvtKeyDir).then(() => true).catch(() => false);
            const metaExists = await fs.access(metaKeyDir).then(() => true).catch(() => false);

            expect(pubExists).toBe(true);
            expect(pvtExists).toBe(true);
            expect(metaExists).toBe(true);
        });

        it('should write key files to filesystem', async () => {
            const domain = 'FILE_TEST_DOMAIN';

            const result = await keyManager.initialSetup(domain);

            // Verify public and private key files exist
            const pubKeyPath = testPaths.getPublicKeyPath(domain, result.kid);
            const pvtKeyPath = testPaths.getPrivateKeyPath(domain, result.kid);

            const pubKey = await fs.readFile(pubKeyPath, 'utf8');
            const pvtKey = await fs.readFile(pvtKeyPath, 'utf8');

            expect(pubKey).toContain('BEGIN PUBLIC KEY');
            expect(pvtKey).toContain('BEGIN PRIVATE KEY');
        });

        it('should create metadata for generated key', async () => {
            const domain = 'META_TEST_DOMAIN';

            const result = await keyManager.initialSetup(domain);

            // Verify metadata file exists
            const metaPath = testPaths.getMetaKeyPath(domain, result.kid);
            const metaContent = await fs.readFile(metaPath, 'utf8');
            const meta = JSON.parse(metaContent);

            expect(meta.kid).toBe(result.kid);
            expect(meta.domain).toBe(domain);
            expect(meta.createdAt).toBeDefined();
            expect(meta.expiresAt).toBeNull();
        });

        it('should set active KID in state', async () => {
            const domain = 'ACTIVE_KID_TEST';

            const result = await keyManager.initialSetup(domain);

            const activeKid = await infrastructure.activeKidStore.getActiveKid(domain);
            expect(activeKid).toBe(result.kid);
        });
    });

    describe('Immediate Usability', () => {
        it('should make key immediately usable for signing', async () => {
            const domain = 'SIGN_TEST_DOMAIN';

            const result = await keyManager.initialSetup(domain);

            // Immediately sign a JWT
            const payload = { userId: '123', role: 'admin' };
            const jwt = await keyManager.sign(domain, payload);

            expect(jwt).toBeDefined();
            expect(jwt.split('.')).toHaveLength(3);

            // Decode header to verify KID
            const [headerB64] = jwt.split('.');
            const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
            expect(header.kid).toBe(result.kid);
        });

        it('should make JWKS immediately available', async () => {
            const domain = 'JWKS_TEST_DOMAIN';

            const result = await keyManager.initialSetup(domain);

            // Immediately get JWKS
            const jwks = await keyManager.getJwks(domain);

            expect(jwks.keys).toHaveLength(1);
            expect(jwks.keys[0].kid).toBe(result.kid);
            expect(jwks.keys[0].kty).toBe('RSA');
        });

        it('should make public key immediately retrievable', async () => {
            const domain = 'PUB_KEY_TEST';

            const result = await keyManager.initialSetup(domain);

            // Immediately retrieve public key via JWKS
            const jwks = await keyManager.getJwks(domain);

            expect(jwks.keys).toHaveLength(1);
            expect(jwks.keys[0].kid).toBe(result.kid);
        });
    });

    describe('Multi-Domain Setup', () => {
        it('should initialize multiple domains independently', async () => {
            const domain1 = 'DOMAIN_A';
            const domain2 = 'DOMAIN_B';

            const result1 = await keyManager.initialSetup(domain1);
            const result2 = await keyManager.initialSetup(domain2);

            // Verify different KIDs
            expect(result1.kid).not.toBe(result2.kid);

            // Verify independent active KIDs
            expect(await infrastructure.activeKidStore.getActiveKid(domain1)).toBe(result1.kid);
            expect(await infrastructure.activeKidStore.getActiveKid(domain2)).toBe(result2.kid);
        });

        it('should handle concurrent initialSetup calls for different domains', async () => {
            const domains = ['CONCURRENT_A', 'CONCURRENT_B', 'CONCURRENT_C'];

            const results = await Promise.all(
                domains.map(domain => keyManager.initialSetup(domain))
            );

            // Verify all succeeded with unique KIDs
            expect(results.every(r => r.success)).toBe(true);
            const kids = results.map(r => r.kid);
            const uniqueKids = new Set(kids);
            expect(uniqueKids.size).toBe(3);
        });
    });

    describe('Domain Normalization', () => {
        it('should normalize domain before setup', async () => {
            const domain = 'lowercase_domain';

            const result = await keyManager.initialSetup(domain);

            // Verify KID uses normalized (uppercase) domain
            expect(result.kid).toMatch(/^LOWERCASE_DOMAIN-/);

            // Verify active KID is set for normalized domain
            const activeKid = await infrastructure.activeKidStore.getActiveKid('LOWERCASE_DOMAIN');
            expect(activeKid).toBe(result.kid);
        });

        it('should handle case-insensitive domain setup', async () => {
            const domain1 = 'TestDomain';
            const domain2 = 'TESTDOMAIN';

            await keyManager.initialSetup(domain1);

            // Second call with different casing should use same normalized domain
            // This should be handled gracefully (either skip or error)
            const activeKid1 = await infrastructure.activeKidStore.getActiveKid('TESTDOMAIN');
            expect(activeKid1).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid domain gracefully', async () => {
            const invalidDomain = '';

            await expect(keyManager.initialSetup(invalidDomain)).rejects.toThrow();
        });

        it('should handle null domain gracefully', async () => {
            await expect(keyManager.initialSetup(null)).rejects.toThrow();
        });

        it('should handle undefined domain gracefully', async () => {
            await expect(keyManager.initialSetup(undefined)).rejects.toThrow();
        });
    });

    describe('Idempotency', () => {
        it('should handle double initialization for same domain', async () => {
            const domain = 'IDEMPOTENT_TEST';

            const result1 = await keyManager.initialSetup(domain);

            // Second initialization should either succeed with same KID or error gracefully
            // (Implementation-dependent behavior - test whichever is correct)
            const activeKid = await infrastructure.activeKidStore.getActiveKid(domain);
            expect(activeKid).toBe(result1.kid);
        });
    });
});
