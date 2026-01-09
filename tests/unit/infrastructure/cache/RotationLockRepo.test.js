import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rotationLockRepo } from '../../../../src/infrastructure/cache/rotationLockRepo.js';
import redis from '../../../../src/infrastructure/cache/redisClient.js';

// Mock Redis client
vi.mock('../../../../src/infrastructure/cache/redisClient.js', () => ({
    default: {
        set: vi.fn(),
        eval: vi.fn()
    }
}));

describe('RotationLockRepo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('acquire', () => {
        it('should acquire lock successfully and return token', async () => {
            redis.set.mockResolvedValue('OK');

            const token = await rotationLockRepo.acquire('DOMAIN_A', 30);

            expect(token).toBeTruthy();
            expect(typeof token).toBe('string');
            expect(redis.set).toHaveBeenCalledWith(
                'rotation_lock:DOMAIN_A',
                token,
                'NX',
                'EX',
                30
            );
        });

        it('should return null when lock already exists', async () => {
            redis.set.mockResolvedValue(null);

            const token = await rotationLockRepo.acquire('DOMAIN_B', 30);

            expect(token).toBeNull();
        });

        it('should use unique token for each lock acquisition', async () => {
            redis.set.mockResolvedValue('OK');

            const token1 = await rotationLockRepo.acquire('DOMAIN_C', 30);
            const token2 = await rotationLockRepo.acquire('DOMAIN_C', 30);

            expect(token1).not.toBe(token2);
        });

        it('should generate valid UUID v4 token', async () => {
            redis.set.mockResolvedValue('OK');

            const token = await rotationLockRepo.acquire('DOMAIN_D', 30);

            // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(token).toMatch(uuidRegex);
        });

        it('should include domain in lock key', async () => {
            redis.set.mockResolvedValue('OK');

            await rotationLockRepo.acquire('TEST_DOMAIN', 30);

            const callArgs = redis.set.mock.calls[0];
            expect(callArgs[0]).toBe('rotation_lock:TEST_DOMAIN');
        });

        it('should pass TTL to Redis SET command', async () => {
            redis.set.mockResolvedValue('OK');

            await rotationLockRepo.acquire('DOMAIN_E', 60);

            expect(redis.set).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                'NX',
                'EX',
                60
            );
        });

        it('should use NX flag to ensure atomicity', async () => {
            redis.set.mockResolvedValue('OK');

            await rotationLockRepo.acquire('DOMAIN_F', 30);

            const callArgs = redis.set.mock.calls[0];
            expect(callArgs[2]).toBe('NX'); // Set only if not exists
        });

        it('should use EX flag for TTL in seconds', async () => {
            redis.set.mockResolvedValue('OK');

            await rotationLockRepo.acquire('DOMAIN_G', 30);

            const callArgs = redis.set.mock.calls[0];
            expect(callArgs[3]).toBe('EX'); // Expiry in seconds
        });

        it('should handle different TTL values', async () => {
            redis.set.mockResolvedValue('OK');
            const ttlValues = [10, 30, 60, 120, 300];

            for (const ttl of ttlValues) {
                await rotationLockRepo.acquire('DOMAIN', ttl);
            }

            expect(redis.set).toHaveBeenCalledTimes(ttlValues.length);
            ttlValues.forEach((ttl, idx) => {
                expect(redis.set.mock.calls[idx][4]).toBe(ttl);
            });
        });

        it('should handle domains with special characters', async () => {
            redis.set.mockResolvedValue('OK');
            const domains = ['DOMAIN-1', 'DOMAIN_2', 'DOMAIN.3', 'DOMAIN:4'];

            for (const domain of domains) {
                await rotationLockRepo.acquire(domain, 30);
            }

            expect(redis.set).toHaveBeenCalledTimes(domains.length);
        });

        it('should propagate Redis errors', async () => {
            const error = new Error('Redis connection failed');
            redis.set.mockRejectedValue(error);

            await expect(rotationLockRepo.acquire('DOMAIN_H', 30))
                .rejects.toThrow('Redis connection failed');
        });

        it('should handle Redis timeout', async () => {
            redis.set.mockRejectedValue(new Error('Operation timed out'));

            await expect(rotationLockRepo.acquire('DOMAIN_I', 30))
                .rejects.toThrow('Operation timed out');
        });

        it('should handle zero TTL', async () => {
            redis.set.mockResolvedValue('OK');

            await rotationLockRepo.acquire('DOMAIN_J', 0);

            expect(redis.set).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                'NX',
                'EX',
                0
            );
        });

        it('should handle negative TTL (Redis behavior)', async () => {
            redis.set.mockResolvedValue('OK');

            await rotationLockRepo.acquire('DOMAIN_K', -1);

            expect(redis.set).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                'NX',
                'EX',
                -1
            );
        });
    });

    describe('release', () => {
        it('should release lock with correct token', async () => {
            redis.eval.mockResolvedValue(1); // 1 = deleted

            const result = await rotationLockRepo.release('DOMAIN_A', 'valid-token-123');

            expect(result).toBe(1);
            expect(redis.eval).toHaveBeenCalledWith(
                expect.stringContaining('redis.call("get", KEYS[1])'),
                1,
                'rotation_lock:DOMAIN_A',
                'valid-token-123'
            );
        });

        it('should return 0 when token does not match', async () => {
            redis.eval.mockResolvedValue(0);

            const result = await rotationLockRepo.release('DOMAIN_B', 'wrong-token');

            expect(result).toBe(0);
        });

        it('should use Lua script for atomic release', async () => {
            redis.eval.mockResolvedValue(1);

            await rotationLockRepo.release('DOMAIN_C', 'token-456');

            const luaScript = redis.eval.mock.calls[0][0];
            expect(luaScript).toContain('redis.call("get", KEYS[1])');
            expect(luaScript).toContain('redis.call("del", KEYS[1])');
            expect(luaScript).toContain('ARGV[1]');
        });

        it('should pass key count as 1 to eval', async () => {
            redis.eval.mockResolvedValue(1);

            await rotationLockRepo.release('DOMAIN_D', 'token-789');

            const keyCount = redis.eval.mock.calls[0][1];
            expect(keyCount).toBe(1);
        });

        it('should include domain in lock key', async () => {
            redis.eval.mockResolvedValue(1);

            await rotationLockRepo.release('TEST_DOMAIN_X', 'token-abc');

            const key = redis.eval.mock.calls[0][2];
            expect(key).toBe('rotation_lock:TEST_DOMAIN_X');
        });

        it('should pass token as argument to Lua script', async () => {
            redis.eval.mockResolvedValue(1);

            await rotationLockRepo.release('DOMAIN_E', 'my-unique-token');

            const token = redis.eval.mock.calls[0][3];
            expect(token).toBe('my-unique-token');
        });

        it('should prevent releasing lock with wrong token (security)', async () => {
            redis.eval.mockResolvedValue(0);

            const result = await rotationLockRepo.release('DOMAIN_F', 'attacker-token');

            expect(result).toBe(0); // Lock not released
        });

        it('should handle domains with special characters', async () => {
            redis.eval.mockResolvedValue(1);
            const domains = ['DOMAIN-1', 'DOMAIN_2', 'DOMAIN.3', 'DOMAIN:4'];

            for (const domain of domains) {
                await rotationLockRepo.release(domain, 'token');
            }

            expect(redis.eval).toHaveBeenCalledTimes(domains.length);
        });

        it('should propagate Redis errors', async () => {
            const error = new Error('Redis eval failed');
            redis.eval.mockRejectedValue(error);

            await expect(rotationLockRepo.release('DOMAIN_G', 'token'))
                .rejects.toThrow('Redis eval failed');
        });

        it('should handle Redis connection errors', async () => {
            redis.eval.mockRejectedValue(new Error('Connection lost'));

            await expect(rotationLockRepo.release('DOMAIN_H', 'token'))
                .rejects.toThrow('Connection lost');
        });

        it('should handle UUID tokens', async () => {
            redis.eval.mockResolvedValue(1);
            const uuidToken = '550e8400-e29b-41d4-a716-446655440000';

            await rotationLockRepo.release('DOMAIN_I', uuidToken);

            const token = redis.eval.mock.calls[0][3];
            expect(token).toBe(uuidToken);
        });

        it('should handle empty string token', async () => {
            redis.eval.mockResolvedValue(0);

            const result = await rotationLockRepo.release('DOMAIN_J', '');

            expect(result).toBe(0);
        });
    });

    describe('integration scenarios', () => {
        it('should follow acquire-release cycle', async () => {
            redis.set.mockResolvedValue('OK');
            redis.eval.mockResolvedValue(1);

            const token = await rotationLockRepo.acquire('DOMAIN_X', 30);
            expect(token).toBeTruthy();

            const released = await rotationLockRepo.release('DOMAIN_X', token);
            expect(released).toBe(1);
        });

        it('should prevent second acquire when lock exists', async () => {
            redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);

            const token1 = await rotationLockRepo.acquire('DOMAIN_Y', 30);
            const token2 = await rotationLockRepo.acquire('DOMAIN_Y', 30);

            expect(token1).toBeTruthy();
            expect(token2).toBeNull();
        });

        it('should allow re-acquire after release', async () => {
            redis.set.mockResolvedValue('OK');
            redis.eval.mockResolvedValue(1);

            const token1 = await rotationLockRepo.acquire('DOMAIN_Z', 30);
            await rotationLockRepo.release('DOMAIN_Z', token1);

            const token2 = await rotationLockRepo.acquire('DOMAIN_Z', 30);

            expect(token1).toBeTruthy();
            expect(token2).toBeTruthy();
            expect(token1).not.toBe(token2);
        });

        it('should handle concurrent lock attempts on different domains', async () => {
            redis.set.mockResolvedValue('OK');

            const [token1, token2, token3] = await Promise.all([
                rotationLockRepo.acquire('DOMAIN_A', 30),
                rotationLockRepo.acquire('DOMAIN_B', 30),
                rotationLockRepo.acquire('DOMAIN_C', 30)
            ]);

            expect(token1).toBeTruthy();
            expect(token2).toBeTruthy();
            expect(token3).toBeTruthy();
            expect(redis.set).toHaveBeenCalledTimes(3);
        });

        it('should handle failed release gracefully', async () => {
            redis.set.mockResolvedValue('OK');
            redis.eval.mockResolvedValue(0); // Token mismatch

            const token = await rotationLockRepo.acquire('DOMAIN_W', 30);
            const released = await rotationLockRepo.release('DOMAIN_W', 'wrong-token');

            expect(token).toBeTruthy();
            expect(released).toBe(0);
        });

        it('should use different keys for different domains', async () => {
            redis.set.mockResolvedValue('OK');

            await rotationLockRepo.acquire('DOMAIN_1', 30);
            await rotationLockRepo.acquire('DOMAIN_2', 30);

            expect(redis.set.mock.calls[0][0]).toBe('rotation_lock:DOMAIN_1');
            expect(redis.set.mock.calls[1][0]).toBe('rotation_lock:DOMAIN_2');
        });
    });

    describe('singleton instance', () => {
        it('should export singleton instance', () => {
            expect(rotationLockRepo).toBeDefined();
            expect(typeof rotationLockRepo.acquire).toBe('function');
            expect(typeof rotationLockRepo.release).toBe('function');
        });

        it('should be the same instance across imports', async () => {
            const { rotationLockRepo: instance2 } = await import('../../../../src/infrastructure/cache/rotationLockRepo.js');
            expect(rotationLockRepo).toBe(instance2);
        });
    });

    describe('lock key format', () => {
        it('should use consistent key prefix', async () => {
            redis.set.mockResolvedValue('OK');
            const domains = ['A', 'B', 'C'];

            for (const domain of domains) {
                await rotationLockRepo.acquire(domain, 30);
            }

            redis.set.mock.calls.forEach((call, idx) => {
                expect(call[0]).toBe(`rotation_lock:${domains[idx]}`);
            });
        });

        it('should maintain key format for release', async () => {
            redis.eval.mockResolvedValue(1);

            await rotationLockRepo.release('MY_DOMAIN', 'token');

            expect(redis.eval.mock.calls[0][2]).toBe('rotation_lock:MY_DOMAIN');
        });
    });
});
