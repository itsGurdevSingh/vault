/**
 * Integration Test: KeyManager rotate Method
 * 
 * Tests the keyManager.rotate() method - immediate rotation trigger for all/remaining domains.
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
import { clearFactorySingletons, createTestInfrastructure, clearPolicyStore } from './helpers/infrastructure.js';

describe('Integration: KeyManager rotate Method', () => {
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
            ActiveKidCache: infrastructure.ActiveKidCache
        });

        keyManager = await factory.create();

        // Clear state
        infrastructure.ActiveKidCache.clearAll();
    });

    afterEach(async () => {
        // Clear policy store
        clearPolicyStore();

        // Cleanup test storage
        try {
            await fs.rm(TEST_STORAGE, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
    });

    describe('Immediate Rotation Trigger', () => {
        it('should rotate existing domain and generate new key', async () => {
            const domain = 'ROTATE_TEST';

            // Setup: Create initial key
            const setupResult = await keyManager.initialSetupDomain(domain);
            const initialKid = setupResult.kid;

            // Trigger rotation for this specific domain
            await keyManager.rotateDomain(domain);

            // Verify new key is now active (different from initial)
            const activeKid = await infrastructure.ActiveKidCache.get(domain);
            expect(activeKid).toBeDefined();
            expect(activeKid).not.toBe(initialKid);

            // Verify new key works for signing
            const token = await keyManager.sign(domain, { test: 'data' });
            expect(token).toBeDefined();
        }, 15000);

        it('should handle rotation request gracefully when no keys exist', async () => {
            const domain = 'NO_KEYS_DOMAIN';

            // Rotation throws error when no policy exists
            await expect(keyManager.rotateDomain(domain))
                .rejects
                .toThrow(/No policy found/);

            // Verify no active kid was set (rotation failed)
            const activeKid = await infrastructure.ActiveKidCache.get(domain);
            expect(activeKid).toBeNull();
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid domain gracefully', async () => {
            await expect(keyManager.rotateDomain('')).rejects.toThrow();
        });
    });
});
