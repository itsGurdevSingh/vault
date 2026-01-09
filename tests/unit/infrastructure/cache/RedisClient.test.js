import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock methods
const mockOn = vi.fn();
const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDel = vi.fn();
const mockExists = vi.fn();
const mockExpire = vi.fn();
const mockTtl = vi.fn();
const mockKeys = vi.fn();
const mockQuit = vi.fn();
const mockDisconnect = vi.fn();
const mockPing = vi.fn();

// Track constructor calls
let constructorArgs = null;

// Mock ioredis as a class
class MockRedis {
    constructor(config) {
        constructorArgs = config;
        this.on = mockOn;
        this.set = mockSet;
        this.get = mockGet;
        this.del = mockDel;
        this.exists = mockExists;
        this.expire = mockExpire;
        this.ttl = mockTtl;
        this.keys = mockKeys;
        this.quit = mockQuit;
        this.disconnect = mockDisconnect;
        this.ping = mockPing;
    }
}

vi.mock('ioredis', () => ({
    default: MockRedis
}));

// Mock logger
vi.mock('../../../../src/infrastructure/logging/logger.js', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

// Mock envConfig
vi.mock('../../../../src/config/envConfig.js', () => ({
    getEnvConfig: vi.fn((key) => {
        const config = {
            'REDIS_HOST': 'localhost',
            'REDIS_PORT': 6379,
            'REDIS_PASSWORD': 'test-password'
        };
        return config[key];
    })
}));

// Import after mocks are set up
const logger = (await import('../../../../src/infrastructure/logging/logger.js')).default;
const { getEnvConfig } = await import('../../../../src/config/envConfig.js');
const redis = (await import('../../../../src/infrastructure/cache/redisClient.js')).default;

describe('RedisClient', () => {
    beforeEach(() => {
        // Only clear operation mocks, not event handler mocks
        mockSet.mockClear();
        mockGet.mockClear();
        mockDel.mockClear();
        mockExists.mockClear();
        mockExpire.mockClear();
        mockTtl.mockClear();
        mockKeys.mockClear();
        mockQuit.mockClear();
        mockDisconnect.mockClear();
        mockPing.mockClear();
        logger.info.mockClear();
        logger.error.mockClear();
    });

    describe('initialization', () => {
        it('should create Redis instance with config from environment', () => {
            expect(constructorArgs).toEqual({
                host: 'localhost',
                port: 6379,
                password: 'test-password'
            });
        });

        it('should read REDIS_HOST from environment', () => {
            expect(getEnvConfig).toHaveBeenCalledWith('REDIS_HOST');
        });

        it('should read REDIS_PORT from environment', () => {
            expect(getEnvConfig).toHaveBeenCalledWith('REDIS_PORT');
        });

        it('should read REDIS_PASSWORD from environment', () => {
            expect(getEnvConfig).toHaveBeenCalledWith('REDIS_PASSWORD');
        });
    });

    describe('event handlers', () => {
        it('should register connect event handler', () => {
            expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
        });

        it('should register error event handler', () => {
            expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
        });

        it('should log info message on connect', () => {
            // Find the connect handler
            const connectCall = mockOn.mock.calls.find(call => call[0] === 'connect');
            expect(connectCall).toBeDefined();

            // Call the connect handler
            const connectHandler = connectCall[1];
            connectHandler();

            expect(logger.info).toHaveBeenCalledWith('Connected to Redis');
        });

        it('should log error message on error', () => {
            // Find the error handler
            const errorCall = mockOn.mock.calls.find(call => call[0] === 'error');
            expect(errorCall).toBeDefined();

            // Call the error handler with an error
            const errorHandler = errorCall[1];
            const testError = new Error('Connection refused');
            errorHandler(testError);

            expect(logger.error).toHaveBeenCalledWith('Redis connection error:', { err: testError });
        });
    });

    describe('redis instance', () => {
        it('should export redis client instance', () => {
            expect(redis).toBeDefined();
            expect(redis).toHaveProperty('set');
        });

        it('should have set method', () => {
            expect(redis.set).toBeDefined();
            expect(typeof redis.set).toBe('function');
        });

        it('should have get method', () => {
            expect(redis.get).toBeDefined();
            expect(typeof redis.get).toBe('function');
        });

        it('should have del method', () => {
            expect(redis.del).toBeDefined();
            expect(typeof redis.del).toBe('function');
        });

        it('should have exists method', () => {
            expect(redis.exists).toBeDefined();
            expect(typeof redis.exists).toBe('function');
        });

        it('should have expire method', () => {
            expect(redis.expire).toBeDefined();
            expect(typeof redis.expire).toBe('function');
        });

        it('should have ttl method', () => {
            expect(redis.ttl).toBeDefined();
            expect(typeof redis.ttl).toBe('function');
        });

        it('should have keys method', () => {
            expect(redis.keys).toBeDefined();
            expect(typeof redis.keys).toBe('function');
        });

        it('should have quit method', () => {
            expect(redis.quit).toBeDefined();
            expect(typeof redis.quit).toBe('function');
        });

        it('should have disconnect method', () => {
            expect(redis.disconnect).toBeDefined();
            expect(typeof redis.disconnect).toBe('function');
        });
    });

    describe('redis operations', () => {
        it('should call set method with correct arguments', async () => {
            mockSet.mockResolvedValue('OK');

            await redis.set('test-key', 'test-value');

            expect(mockSet).toHaveBeenCalledWith('test-key', 'test-value');
        });

        it('should call get method with correct arguments', async () => {
            mockGet.mockResolvedValue('test-value');

            const result = await redis.get('test-key');

            expect(mockGet).toHaveBeenCalledWith('test-key');
            expect(result).toBe('test-value');
        });

        it('should call del method with correct arguments', async () => {
            mockDel.mockResolvedValue(1);

            await redis.del('test-key');

            expect(mockDel).toHaveBeenCalledWith('test-key');
        });

        it('should call exists method with correct arguments', async () => {
            mockExists.mockResolvedValue(1);

            const result = await redis.exists('test-key');

            expect(mockExists).toHaveBeenCalledWith('test-key');
            expect(result).toBe(1);
        });

        it('should call expire method with correct arguments', async () => {
            mockExpire.mockResolvedValue(1);

            await redis.expire('test-key', 3600);

            expect(mockExpire).toHaveBeenCalledWith('test-key', 3600);
        });

        it('should call ttl method with correct arguments', async () => {
            mockTtl.mockResolvedValue(3600);

            const result = await redis.ttl('test-key');

            expect(mockTtl).toHaveBeenCalledWith('test-key');
            expect(result).toBe(3600);
        });

        it('should call keys method with correct pattern', async () => {
            mockKeys.mockResolvedValue(['key1', 'key2', 'key3']);

            const result = await redis.keys('test-*');

            expect(mockKeys).toHaveBeenCalledWith('test-*');
            expect(result).toEqual(['key1', 'key2', 'key3']);
        });
    });

    describe('connection management', () => {
        it('should call quit to gracefully close connection', async () => {
            mockQuit.mockResolvedValue('OK');

            await redis.quit();

            expect(mockQuit).toHaveBeenCalled();
        });

        it('should call disconnect to forcefully close connection', async () => {
            mockDisconnect.mockResolvedValue(undefined);

            await redis.disconnect();

            expect(mockDisconnect).toHaveBeenCalled();
        });

        it('should call ping to check connection', async () => {
            mockPing.mockResolvedValue('PONG');

            const result = await redis.ping();

            expect(mockPing).toHaveBeenCalled();
            expect(result).toBe('PONG');
        });
    });

    describe('error handling', () => {
        it('should propagate set errors', async () => {
            const error = new Error('Redis error');
            mockSet.mockRejectedValue(error);

            await expect(redis.set('key', 'value')).rejects.toThrow('Redis error');
        });

        it('should propagate get errors', async () => {
            const error = new Error('Redis error');
            mockGet.mockRejectedValue(error);

            await expect(redis.get('key')).rejects.toThrow('Redis error');
        });

        it('should propagate del errors', async () => {
            const error = new Error('Redis error');
            mockDel.mockRejectedValue(error);

            await expect(redis.del('key')).rejects.toThrow('Redis error');
        });

        it('should handle connection errors via error event', () => {
            const errorCall = mockOn.mock.calls.find(call => call[0] === 'error');
            const errorHandler = errorCall[1];

            const connectionError = new Error('ECONNREFUSED');
            errorHandler(connectionError);

            expect(logger.error).toHaveBeenCalledWith('Redis connection error:', { err: connectionError });
        });
    });

    describe('singleton pattern', () => {
        it('should export the same redis instance', async () => {
            const redis1 = (await import('../../../../src/infrastructure/cache/redisClient.js')).default;
            const redis2 = (await import('../../../../src/infrastructure/cache/redisClient.js')).default;

            expect(redis1).toBe(redis2);
        });
    });
});
