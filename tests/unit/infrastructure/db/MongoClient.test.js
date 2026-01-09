import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mongoose
const mockConnect = vi.fn();

vi.mock('mongoose', () => ({
    default: {
        connect: mockConnect
    }
}));

// Mock envConfig
vi.mock('../../../../src/config/envConfig.js', () => ({
    getEnvConfig: vi.fn((key) => {
        if (key === 'MONGO_DB_URI') {
            return 'mongodb://localhost:27017/test-db';
        }
        return null;
    })
}));

// Mock console
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => { });

// Import after mocks are set up
const mongoose = (await import('mongoose')).default;
const { getEnvConfig } = await import('../../../../src/config/envConfig.js');
const { connectDB } = await import('../../../../src/infrastructure/db/mongoClient.js');

describe('MongoClient', () => {
    beforeEach(() => {
        mockConnect.mockClear();
        mockConsoleLog.mockClear();
        getEnvConfig.mockClear();
    });

    describe('configuration', () => {
        it('should use correct MongoDB URI', () => {
            const uri = getEnvConfig('MONGO_DB_URI');
            expect(uri).toBe('mongodb://localhost:27017/test-db');
        });

        it('should provide MongoDB URI from environment', () => {
            // getEnvConfig is called during module import
            expect(getEnvConfig('MONGO_DB_URI')).toBe('mongodb://localhost:27017/test-db');
        });
    });

    describe('connectDB', () => {
        it('should call mongoose.connect with correct URI', async () => {
            mockConnect.mockResolvedValue(undefined);

            await connectDB();

            expect(mockConnect).toHaveBeenCalledWith('mongodb://localhost:27017/test-db');
        });

        it('should call mongoose.connect exactly once', async () => {
            mockConnect.mockResolvedValue(undefined);

            await connectDB();

            expect(mockConnect).toHaveBeenCalledTimes(1);
        });

        it('should log success message on successful connection', async () => {
            mockConnect.mockResolvedValue(undefined);

            await connectDB();

            expect(mockConsoleLog).toHaveBeenCalledWith('MongoDB connected');
        });

        it('should return without error on successful connection', async () => {
            mockConnect.mockResolvedValue(undefined);

            await expect(connectDB()).resolves.toBeUndefined();
        });
    });

    describe('error handling', () => {
        it('should log failure message when connection fails', async () => {
            const error = new Error('Connection refused');
            mockConnect.mockRejectedValue(error);

            try {
                await connectDB();
            } catch (err) {
                // Expected to throw
            }

            expect(mockConsoleLog).toHaveBeenCalledWith('failed to connect to db ');
        });

        it('should throw error when mongoose.connect fails', async () => {
            const error = new Error('Connection refused');
            mockConnect.mockRejectedValue(error);

            await expect(connectDB()).rejects.toThrow('Connection refused');
        });

        it('should propagate the original error', async () => {
            const originalError = new Error('ECONNREFUSED');
            mockConnect.mockRejectedValue(originalError);

            try {
                await connectDB();
            } catch (err) {
                expect(err).toBe(originalError);
            }
        });

        it('should handle authentication errors', async () => {
            const authError = new Error('Authentication failed');
            mockConnect.mockRejectedValue(authError);

            await expect(connectDB()).rejects.toThrow('Authentication failed');
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network timeout');
            mockConnect.mockRejectedValue(networkError);

            await expect(connectDB()).rejects.toThrow('Network timeout');
        });

        it('should handle invalid URI errors', async () => {
            const uriError = new Error('Invalid URI');
            mockConnect.mockRejectedValue(uriError);

            await expect(connectDB()).rejects.toThrow('Invalid URI');
        });
    });

    describe('multiple connection attempts', () => {
        it('should handle multiple successful connections', async () => {
            mockConnect.mockResolvedValue(undefined);

            await connectDB();
            await connectDB();

            expect(mockConnect).toHaveBeenCalledTimes(2);
        });

        it('should log success message for each connection', async () => {
            mockConnect.mockResolvedValue(undefined);

            await connectDB();
            await connectDB();

            expect(mockConsoleLog).toHaveBeenCalledWith('MongoDB connected');
            expect(mockConsoleLog).toHaveBeenCalledTimes(2);
        });

        it('should handle retry after failure', async () => {
            mockConnect
                .mockRejectedValueOnce(new Error('First attempt failed'))
                .mockResolvedValueOnce(undefined);

            // First attempt should fail
            await expect(connectDB()).rejects.toThrow('First attempt failed');

            // Second attempt should succeed
            await expect(connectDB()).resolves.toBeUndefined();
        });
    });

    describe('connection state', () => {
        it('should call mongoose.connect even if previously connected', async () => {
            mockConnect.mockResolvedValue(undefined);

            await connectDB();
            await connectDB();

            // Should be called twice, mongoose handles connection state internally
            expect(mockConnect).toHaveBeenCalledTimes(2);
        });

        it('should use the same URI for all connections', async () => {
            mockConnect.mockResolvedValue(undefined);

            await connectDB();
            await connectDB();

            const calls = mockConnect.mock.calls;
            expect(calls[0][0]).toBe(calls[1][0]);
        });
    });

    describe('async behavior', () => {
        it('should be an async function', () => {
            expect(connectDB).toBeInstanceOf(Function);
            expect(connectDB.constructor.name).toBe('AsyncFunction');
        });

        it('should return a Promise', () => {
            mockConnect.mockResolvedValue(undefined);

            const result = connectDB();

            expect(result).toBeInstanceOf(Promise);
        });

        it('should await mongoose.connect', async () => {
            let resolved = false;
            mockConnect.mockImplementation(() => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolved = true;
                        resolve(undefined);
                    }, 10);
                });
            });

            expect(resolved).toBe(false);
            await connectDB();
            expect(resolved).toBe(true);
        });
    });

    describe('logging', () => {
        it('should log failure message before throwing error', async () => {
            const error = new Error('Test error');
            mockConnect.mockRejectedValue(error);

            try {
                await connectDB();
            } catch (err) {
                // Expected
            }

            // Verify failure message was logged
            expect(mockConsoleLog).toHaveBeenCalledWith('failed to connect to db ');
            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        });

        it('should log success before returning', async () => {
            mockConnect.mockResolvedValue(undefined);

            await connectDB();

            expect(mockConsoleLog).toHaveBeenCalledWith('MongoDB connected');
        });

        it('should not log success message on failure', async () => {
            const error = new Error('Connection failed');
            mockConnect.mockRejectedValue(error);

            try {
                await connectDB();
            } catch (err) {
                // Expected
            }

            expect(mockConsoleLog).not.toHaveBeenCalledWith('MongoDB connected');
            expect(mockConsoleLog).toHaveBeenCalledWith('failed to connect to db ');
        });
    });
});
