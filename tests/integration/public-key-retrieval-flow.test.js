/**
 * Integration Test: Public Key Retrieval Flow (Facade Level)
 * 
 * Tests keyManager.getPublicKey() via the FACADE (not KeyRegistry directly).
 * Existing loader-flow.test.js tested KeyRegistry directly - this closes that gap.
 * 
 * Flow tested:
 * 1. Call keyManager.getPublicKey(domain, kid)
 * 2. Verify domain normalization
 * 3. Verify caching behavior
 * 4. Verify integration with initialSetup/rotate
 * 
 * Gap Addressed: getPublicKey() was only tested indirectly via internal modules
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import { setupTestEnvironment, cleanupTestEnvironment, createTestKeyPaths } from './helpers/testSetup.js';
import { createMinimalKeyManager } from './helpers/keyManagerFactory.js';
import { activeKidStore } from '../../src/state/ActiveKIDState.js';

describe('Integration: Public Key Retrieval Flow (Facade)', () => {
    let testPaths;
    let keyManager;

    beforeEach(async () => {
        await setupTestEnvironment();
        testPaths = createTestKeyPaths();
        keyManager = await createMinimalKeyManager(testPaths);
        activeKidStore.clearAll();
    });

    afterEach(async () => {
        await cleanupTestEnvironment();
    });

    describe('Facade-Level Retrieval', () => {
        it('should retrieve public key via keyManager.getPublicKey()', async () => {
            const domain = 'RETRIEVAL_TEST';

            // Setup: Initialize domain and get KID
            const { kid } = await keyManager.initialSetup(domain);

            // Test: Retrieve via facade
            const publicKey = await keyManager.getPublicKey(domain, kid);

            expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
            expect(publicKey).toContain('-----END PUBLIC KEY-----');
        });

        it('should normalize domain before retrieval', async () => {
            const domain = 'normalized_test';

            // Setup with lowercase
            const { kid } = await keyManager.initialSetup(domain);

            // Retrieve with different casing
            const publicKey1 = await keyManager.getPublicKey('NORMALIZED_TEST', kid);
            const publicKey2 = await keyManager.getPublicKey('normalized_test', kid);

            expect(publicKey1).toBe(publicKey2);
        });

        it('should cache public key after first retrieval', async () => {
            const domain = 'CACHE_TEST';

            const { kid } = await keyManager.initialSetup(domain);

            // First retrieval (cache miss)
            const publicKey1 = await keyManager.getPublicKey(domain, kid);

            // Second retrieval (cache hit - should be same object reference)
            const publicKey2 = await keyManager.getPublicKey(domain, kid);

            expect(publicKey1).toBe(publicKey2); // Same string reference
        });
    });

    describe('Integration with Setup', () => {
        it('should retrieve key immediately after initialSetup()', async () => {
            const domain = 'SETUP_INTEGRATION';

            // Setup domain
            const { kid } = await keyManager.initialSetup(domain);

            // Immediately retrieve
            const publicKey = await keyManager.getPublicKey(domain, kid);

            expect(publicKey).toBeDefined();
            expect(publicKey).toContain('BEGIN PUBLIC KEY');

            // Verify it's a valid RSA key
            const keyObject = crypto.createPublicKey(publicKey);
            expect(keyObject.asymmetricKeyType).toBe('rsa');
        });

        it('should retrieve multiple keys after setup', async () => {
            const domain = 'MULTI_KEY_TEST';

            // Setup multiple keys manually (simulating rotation)
            const { kid: kid1 } = await keyManager.initialSetup(domain);

            // Manually generate second key (would normally happen via rotation)
            const kid2 = await keyManager.generator.generate(domain);

            // Retrieve both via facade
            const pubKey1 = await keyManager.getPublicKey(domain, kid1);
            const pubKey2 = await keyManager.getPublicKey(domain, kid2);

            expect(pubKey1).not.toBe(pubKey2);
            expect(pubKey1).toContain('BEGIN PUBLIC KEY');
            expect(pubKey2).toContain('BEGIN PUBLIC KEY');
        });
    });

    describe('Error Handling (Facade)', () => {
        it('should throw error for non-existent KID via facade', async () => {
            const domain = 'ERROR_TEST';
            const fakeKid = 'ERROR_TEST-20260111-000000-FAKE1234';

            await keyManager.initialSetup(domain);

            await expect(
                keyManager.getPublicKey(domain, fakeKid)
            ).rejects.toThrow();
        });

        it('should throw error for invalid domain via facade', async () => {
            const kid = 'VALID_DOMAIN-20260111-000000-12345678';

            await expect(
                keyManager.getPublicKey('', kid)
            ).rejects.toThrow();
        });

        it('should throw error for null KID via facade', async () => {
            const domain = 'NULL_KID_TEST';
            await keyManager.initialSetup(domain);

            await expect(
                keyManager.getPublicKey(domain, null)
            ).rejects.toThrow();
        });

        it('should throw error for undefined KID via facade', async () => {
            const domain = 'UNDEF_KID_TEST';
            await keyManager.initialSetup(domain);

            await expect(
                keyManager.getPublicKey(domain, undefined)
            ).rejects.toThrow();
        });
    });

    describe('Multi-Domain Retrieval (Facade)', () => {
        it('should retrieve keys from different domains via facade', async () => {
            const domain1 = 'DOMAIN_X';
            const domain2 = 'DOMAIN_Y';

            const { kid: kid1 } = await keyManager.initialSetup(domain1);
            const { kid: kid2 } = await keyManager.initialSetup(domain2);

            // Retrieve via facade
            const pubKey1 = await keyManager.getPublicKey(domain1, kid1);
            const pubKey2 = await keyManager.getPublicKey(domain2, kid2);

            expect(pubKey1).not.toBe(pubKey2);

            // Verify both are valid RSA keys
            const keyObj1 = crypto.createPublicKey(pubKey1);
            const keyObj2 = crypto.createPublicKey(pubKey2);

            expect(keyObj1.asymmetricKeyType).toBe('rsa');
            expect(keyObj2.asymmetricKeyType).toBe('rsa');
        });

        it('should handle concurrent retrieval via facade', async () => {
            const domain = 'CONCURRENT_RETRIEVAL';

            const { kid } = await keyManager.initialSetup(domain);

            // Concurrent retrievals via facade
            const results = await Promise.all([
                keyManager.getPublicKey(domain, kid),
                keyManager.getPublicKey(domain, kid),
                keyManager.getPublicKey(domain, kid),
            ]);

            // All should return the same key
            expect(results[0]).toBe(results[1]);
            expect(results[1]).toBe(results[2]);
        });

        it('should handle concurrent retrieval of different domains', async () => {
            const domains = ['CONCURRENT_A', 'CONCURRENT_B', 'CONCURRENT_C'];

            // Setup all domains
            const setupResults = await Promise.all(
                domains.map(domain => keyManager.initialSetup(domain))
            );

            // Concurrent retrieval of different domains
            const keys = await Promise.all(
                setupResults.map((result, i) =>
                    keyManager.getPublicKey(domains[i], result.kid)
                )
            );

            // All keys should be different
            expect(keys[0]).not.toBe(keys[1]);
            expect(keys[1]).not.toBe(keys[2]);
            expect(keys[0]).not.toBe(keys[2]);
        });
    });

    describe('Cache Behavior (Facade)', () => {
        it('should cache survive manual file deletion', async () => {
            const domain = 'CACHE_SURVIVAL';

            const { kid } = await keyManager.initialSetup(domain);

            // First retrieval (populates cache)
            const publicKey1 = await keyManager.getPublicKey(domain, kid);

            // Delete file
            const pubKeyPath = testPaths.getPubKeyPath(domain, kid);
            await fs.unlink(pubKeyPath);

            // Should still return from cache
            const publicKey2 = await keyManager.getPublicKey(domain, kid);
            expect(publicKey2).toBe(publicKey1);
        });

        it('should cache per KID independently', async () => {
            const domain = 'PER_KID_CACHE';

            const { kid: kid1 } = await keyManager.initialSetup(domain);
            const kid2 = await keyManager.generator.generate(domain);

            // Retrieve both
            const pubKey1 = await keyManager.getPublicKey(domain, kid1);
            const pubKey2 = await keyManager.getPublicKey(domain, kid2);

            // Retrieve again (should hit cache)
            const pubKey1Cached = await keyManager.getPublicKey(domain, kid1);
            const pubKey2Cached = await keyManager.getPublicKey(domain, kid2);

            expect(pubKey1).toBe(pubKey1Cached);
            expect(pubKey2).toBe(pubKey2Cached);
        });
    });

    describe('Key Format Validation', () => {
        it('should return valid PEM format via facade', async () => {
            const domain = 'FORMAT_TEST';

            const { kid } = await keyManager.initialSetup(domain);
            const publicKey = await keyManager.getPublicKey(domain, kid);

            // Validate PEM structure
            expect(publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----\n/);
            expect(publicKey).toMatch(/\n-----END PUBLIC KEY-----\n$/);

            // Validate base64 content
            const lines = publicKey.split('\n').slice(1, -2);
            expect(lines.every(line => /^[A-Za-z0-9+/=]*$/.test(line))).toBe(true);
        });

        it('should return RSA key usable for verification', async () => {
            const domain = 'VERIFICATION_TEST';

            const { kid } = await keyManager.initialSetup(domain);

            // Sign a JWT
            const payload = { test: 'data' };
            const jwt = await keyManager.sign(domain, payload);

            // Retrieve public key via facade
            const publicKey = await keyManager.getPublicKey(domain, kid);

            // Verify JWT signature
            const [headerB64, payloadB64, signatureB64] = jwt.split('.');
            const signedData = `${headerB64}.${payloadB64}`;
            const signature = Buffer.from(signatureB64, 'base64url');

            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(signedData);
            const isValid = verify.verify(publicKey, signature);

            expect(isValid).toBe(true);
        });
    });
});
