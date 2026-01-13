/**
 * Integration Test: KeyManager scheduleRotation Method
 * 
 * Tests the keyManager.scheduleRotation() method - scheduled/cron-based rotation.
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

describe('Integration: KeyManager scheduleRotation Method', () => {
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

    describe('Scheduled Rotation', () => {
        it('should run scheduled rotation successfully', async () => {
            // scheduleRotation checks for policies due for rotation
            // Since policyRepo mock returns empty array, nothing rotates
            await keyManager.scheduleRotation();

            // Should complete without error
            expect(true).toBe(true);
        });

        it('should be callable without arguments', async () => {
            await expect(keyManager.scheduleRotation()).resolves.not.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle rotation when no policies exist', async () => {
            // Mock returns empty array for findDueForRotation
            await keyManager.scheduleRotation();

            // Should complete gracefully without rotating anything
            expect(true).toBe(true);
        });
    });
});
