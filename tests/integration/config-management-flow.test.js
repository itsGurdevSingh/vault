/**
 * Integration Test: Configuration Management Flow (Facade Level)
 * 
 * Tests keyManager.configure() - runtime configuration updates.
 * Uses the KeyManager FACADE (not RotationConfig directly).
 * 
 * Flow tested:
 * 1. Call keyManager.configure(opts)
 * 2. Verify configuration updates applied
 * 3. Verify validation logic
 * 4. Verify configuration persistence
 * 
 * Gap Addressed: configure() had NO integration test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment, createTestKeyPaths } from './helpers/testSetup.js';
import { createMinimalKeyManager } from './helpers/keyManagerFactory.js';
import { RotationState } from '../../src/domain/key-manager/config/RotationState.js';

describe('Integration: Configuration Management Flow (Facade)', () => {
    let testPaths;
    let keyManager;
    let originalRetryInterval;
    let originalMaxRetries;

    beforeEach(async () => {
        await setupTestEnvironment();
        testPaths = createTestKeyPaths();
        keyManager = await createMinimalKeyManager(testPaths);

        // Save original config for restoration
        originalRetryInterval = RotationState.retryIntervalMs;
        originalMaxRetries = RotationState.maxRetries;
    });

    afterEach(async () => {
        // Restore original configuration
        RotationState.retryIntervalMs = originalRetryInterval;
        RotationState.maxRetries = originalMaxRetries;

        await cleanupTestEnvironment();
    });

    describe('Runtime Configuration Updates', () => {
        it('should update retry interval via facade', () => {
            const newInterval = 120000; // 2 minutes (valid: must be >= 60000ms)

            keyManager.configure({ retryIntervalMs: newInterval });

            expect(RotationState.retryIntervalMs).toBe(newInterval);
        });

        it('should update max retries via facade', () => {
            const newMaxRetries = 5;

            keyManager.configure({ maxRetries: newMaxRetries });

            expect(RotationState.maxRetries).toBe(newMaxRetries);
        });

        it('should merge partial config updates', () => {
            const newInterval = 180000; // 3 minutes (valid: must be >= 60000ms)

            // Update only retry interval
            keyManager.configure({ retryIntervalMs: newInterval });

            expect(RotationState.retryIntervalMs).toBe(newInterval);
            expect(RotationState.maxRetries).toBe(originalMaxRetries); // Unchanged
        });

        it('should update multiple config values simultaneously', () => {
            const newInterval = 150000; // 2.5 minutes (valid: must be >= 60000ms)
            const newMaxRetries = 4;

            keyManager.configure({
                retryIntervalMs: newInterval,
                maxRetries: newMaxRetries,
            });

            expect(RotationState.retryIntervalMs).toBe(newInterval);
            expect(RotationState.maxRetries).toBe(newMaxRetries);
        });
    });

    describe('Configuration Validation', () => {
        it('should reject invalid retry interval (too low)', () => {
            const constraints = RotationState.constraints.retryInterval;
            const tooLow = constraints.minInterval - 1;

            expect(() => {
                keyManager.configure({ retryIntervalMs: tooLow });
            }).toThrow();
        });

        it('should reject invalid retry interval (too high)', () => {
            const constraints = RotationState.constraints.retryInterval;
            const tooHigh = constraints.maxInterval + 1;

            expect(() => {
                keyManager.configure({ retryIntervalMs: tooHigh });
            }).toThrow();
        });

        it('should reject invalid retry interval (non-number)', () => {
            expect(() => {
                keyManager.configure({ retryIntervalMs: '2000' });
            }).toThrow();
        });

        it('should reject invalid max retries (too low)', () => {
            const constraints = RotationState.constraints.maxRetries;
            const tooLow = constraints.minRetries - 1;

            expect(() => {
                keyManager.configure({ maxRetries: tooLow });
            }).toThrow();
        });

        it('should reject invalid max retries (too high)', () => {
            const constraints = RotationState.constraints.maxRetries;
            const tooHigh = constraints.maxRetries + 1;

            expect(() => {
                keyManager.configure({ maxRetries: tooHigh });
            }).toThrow();
        });

        it('should reject invalid max retries (non-integer)', () => {
            expect(() => {
                keyManager.configure({ maxRetries: 3.5 });
            }).toThrow();
        });

        it('should skip null values gracefully', () => {
            const beforeInterval = RotationState.retryIntervalMs;

            // Null values are silently skipped (check: if (retryIntervalMs != null))
            keyManager.configure({ retryIntervalMs: null });

            // Config should remain unchanged
            expect(RotationState.retryIntervalMs).toBe(beforeInterval);
        });
    });

    describe('Configuration Persistence', () => {
        it('should persist config across multiple calls', () => {
            const interval1 = 120000; // 2 minutes (valid)
            const interval2 = 180000; // 3 minutes (valid)

            keyManager.configure({ retryIntervalMs: interval1 });
            expect(RotationState.retryIntervalMs).toBe(interval1);

            keyManager.configure({ retryIntervalMs: interval2 });
            expect(RotationState.retryIntervalMs).toBe(interval2);
        });

        it('should preserve previous config when partial update fails', () => {
            const validInterval = 120000; // 2 minutes (valid)
            keyManager.configure({ retryIntervalMs: validInterval });

            const originalRetry = RotationState.maxRetries;

            // Try invalid max retries
            expect(() => {
                keyManager.configure({ maxRetries: 999 });
            }).toThrow();

            // Previous config should remain
            expect(RotationState.retryIntervalMs).toBe(validInterval);
            expect(RotationState.maxRetries).toBe(originalRetry);
        });

        it('should handle empty config object gracefully', () => {
            const before = {
                interval: RotationState.retryIntervalMs,
                retries: RotationState.maxRetries,
            };

            keyManager.configure({});

            // Config should remain unchanged
            expect(RotationState.retryIntervalMs).toBe(before.interval);
            expect(RotationState.maxRetries).toBe(before.retries);
        });
    });

    describe('Config Boundaries', () => {
        it('should accept minimum valid retry interval', () => {
            const minInterval = RotationState.constraints.retryInterval.minInterval;

            keyManager.configure({ retryIntervalMs: minInterval });

            expect(RotationState.retryIntervalMs).toBe(minInterval);
        });

        it('should accept maximum valid retry interval', () => {
            const maxInterval = RotationState.constraints.retryInterval.maxInterval;

            keyManager.configure({ retryIntervalMs: maxInterval });

            expect(RotationState.retryIntervalMs).toBe(maxInterval);
        });

        it('should accept minimum valid max retries', () => {
            const minRetries = RotationState.constraints.maxRetries.minRetries;

            keyManager.configure({ maxRetries: minRetries });

            expect(RotationState.maxRetries).toBe(minRetries);
        });

        it('should accept maximum valid max retries', () => {
            const maxRetries = RotationState.constraints.maxRetries.maxRetries;

            keyManager.configure({ maxRetries: maxRetries });

            expect(RotationState.maxRetries).toBe(maxRetries);
        });
    });
});
