/**
 * Integration Test: KeyManager rotateDomain Method
 * 
 * Tests the keyManager.rotateDomain() method - domain-specific key rotation.
 * Uses REAL implementations with proper Dependency Injection.
 * 
 * Architecture:
 * - Imports ONLY from src/domain/key-manager/index.js (ManagerFactory)
 * - Uses ManagerFactory.create() with explicit DI
 * - Passes outsider dependencies: pathService, cryptoEngine, lockRepo, policyRepo, Cache, activeKidStore
 * - Uses isolated storage-test folder (cleaned up after each test)
 * - Clears factory singletons before each test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { ManagerFactory } from '../../src/domain/key-manager/index.js';
import { clearFactorySingletons, createTestInfrastructure } from './helpers/infrastructure.js';

describe('Integration: KeyManager rotateDomain Method', () => {
    let infrastructure;
    let keyManager;
    const TEST_STORAGE = path.resolve('storage-test');

    beforeEach(async () => {
        // Clear all factory singletons
        clearFactorySingletons();

        // Create test infrastructure with isolated storage
        const testPaths = {
            base: (domain) => path.join(TEST_STORAGE, 'keys', domain),
            privateDir: (domain) => path.join(TEST_STORAGE, 'keys', domain, 'private'),
            publicDir: (domain) => path.join(TEST_STORAGE, 'keys', domain, 'public'),
            privateKey: (domain, kid) => path.join(TEST_STORAGE, 'keys', domain, 'private', `${kid}.pem`),
            publicKey: (domain, kid) => path.join(TEST_STORAGE, 'keys', domain, 'public', `${kid}.pem`),
            metaKeyDir: (domain) => path.join(TEST_STORAGE, 'metadata', 'keys', domain),
            metaKeyFile: (domain, kid) => path.join(TEST_STORAGE, 'metadata', 'keys', domain, `${kid}.meta`),
            metaArchivedDir: () => path.join(TEST_STORAGE, 'metadata', 'keys', 'archived'),
            metaArchivedKeyFile: (kid) => path.join(TEST_STORAGE, 'metadata', 'keys', 'archived', `${kid}.meta`),
        };

        infrastructure = createTestInfrastructure(testPaths);

        // Create KeyManager with DI
        const factory = new ManagerFactory({
            pathService: testPaths,
            cryptoEngine: infrastructure.cryptoEngine,
            lockRepo: infrastructure.lockRepo,
            policyRepo: infrastructure.policyRepo,
            Cache: infrastructure.Cache,
            activeKidStore: infrastructure.activeKidStore
        });

        keyManager = await factory.create();

        // Clear state
        infrastructure.activeKidStore.clearAll();
    });

    afterEach(async () => {
        // Cleanup test storage
        try {
            await fs.rm(TEST_STORAGE, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
    });

    describe('Basic Rotation', () => {
        it('should rotate domain to new key', async () => {
            const domain = 'ROTATE_TEST';

            const { kid: oldKid } = await keyManager.initialSetup(domain);
            await keyManager.rotateDomain(domain);

            // Verify new key is active (different from old)
            const activeKid = await infrastructure.activeKidStore.getActiveKid(domain);
            expect(activeKid).toBeDefined();
            expect(activeKid).not.toBe(oldKid);
        }, 15000);

        it('should update active KID after rotation', async () => {
            const domain = 'ACTIVE_KID_ROTATE';

            const { kid: oldKid } = await keyManager.initialSetup(domain);
            await keyManager.rotateDomain(domain);

            const activeKid = await infrastructure.activeKidStore.getActiveKid(domain);
            expect(activeKid).toBeDefined();
            expect(activeKid).not.toBe(oldKid);
        }, 15000);

        it('should make new key immediately usable for signing', async () => {
            const domain = 'SIGN_AFTER_ROTATE';
            const payload = { test: 'data' };

            await keyManager.initialSetup(domain);
            const oldKid = await infrastructure.activeKidStore.getActiveKid(domain);

            await keyManager.rotateDomain(domain);

            const jwt = await keyManager.sign(domain, payload);
            const header = JSON.parse(Buffer.from(jwt.split('.')[0], 'base64url').toString());

            expect(header.kid).toBeDefined();
            expect(header.kid).not.toBe(oldKid);
        }, 15000);
    });

    describe('Domain Normalization', () => {
        it('should normalize domain before rotation', async () => {
            const domain = 'lowercase_rotate';

            await keyManager.initialSetup(domain);
            await keyManager.rotateDomain('LOWERCASE_ROTATE');

            // Verify rotation worked (active kid exists for normalized domain)
            const activeKid = await infrastructure.activeKidStore.getActiveKid('LOWERCASE_ROTATE');
            expect(activeKid).toBeDefined();
        }, 15000);
    });

    describe('Error Handling', () => {
        it('should throw error for invalid domain', async () => {
            await expect(keyManager.rotateDomain(null))
                .rejects
                .toThrow(/Domain must be a non-empty string/i);
        });

        it('should handle gracefully when no active KID exists', async () => {
            const domain = 'NO_ACTIVE_KEY';

            // Rotation completes but logs error internally
            await keyManager.rotateDomain(domain);

            // Verify no active kid was set
            const activeKid = await infrastructure.activeKidStore.getActiveKid(domain);
            expect(activeKid).toBeUndefined();
        });
    });

    describe('Multiple Rotations', () => {
        it('should handle multiple sequential rotations', async () => {
            const domain = 'MULTI_ROTATE';

            const { kid: kid1 } = await keyManager.initialSetup(domain);
            await keyManager.rotateDomain(domain);
            const kid2 = await infrastructure.activeKidStore.getActiveKid(domain);

            await keyManager.rotateDomain(domain);
            const kid3 = await infrastructure.activeKidStore.getActiveKid(domain);

            expect(kid1).not.toBe(kid2);
            expect(kid2).not.toBe(kid3);
            expect(kid1).not.toBe(kid3);
            expect(kid3).toBeDefined();
        }, 30000);
    });
});
