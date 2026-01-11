import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RSAKeyGenerator } from '../../../../src/domain/key-manager/modules/generator/RSAKeyGenerator.js';

describe('RSAKeyGenerator', () => {
    let mockCryptoEngine;
    let mockMetadataManager;
    let mockKeyWriter;
    let mockDirManager;
    let generator;

    beforeEach(() => {
        // Reset all mocks before each test
        mockCryptoEngine = {
            generateKID: vi.fn(),
            generateKeyPair: vi.fn()
        };

        mockMetadataManager = {
            create: vi.fn()
        };

        mockKeyWriter = {
            save: vi.fn()
        };

        mockDirManager = {
            ensure: vi.fn()
        };

        generator = new RSAKeyGenerator(
            mockCryptoEngine,
            mockMetadataManager,
            mockKeyWriter,
            mockDirManager
        );
    });

    describe('constructor', () => {
        it('should initialize with all required dependencies', () => {
            // Test: Verify all dependencies are stored
            expect(generator.cryptoEngine).toBe(mockCryptoEngine);
            expect(generator.metadataManager).toBe(mockMetadataManager);
            expect(generator.keyWriter).toBe(mockKeyWriter);
            expect(generator.dirManager).toBe(mockDirManager);
        });

        it('should accept cryptoEngine as first parameter', () => {
            // Test: CryptoEngine dependency injection
            const customEngine = { custom: 'engine' };
            const gen = new RSAKeyGenerator(customEngine, mockMetadataManager, mockKeyWriter, mockDirManager);

            expect(gen.cryptoEngine).toBe(customEngine);
        });

        it('should accept metadataManager as second parameter', () => {
            // Test: MetadataManager dependency injection
            const customManager = { custom: 'manager' };
            const gen = new RSAKeyGenerator(mockCryptoEngine, customManager, mockKeyWriter, mockDirManager);

            expect(gen.metadataManager).toBe(customManager);
        });

        it('should accept keyWriter as third parameter', () => {
            // Test: KeyWriter dependency injection
            const customWriter = { custom: 'writer' };
            const gen = new RSAKeyGenerator(mockCryptoEngine, mockMetadataManager, customWriter, mockDirManager);

            expect(gen.keyWriter).toBe(customWriter);
        });

        it('should accept dirManager as fourth parameter', () => {
            // Test: DirManager dependency injection
            const customDirMgr = { custom: 'dirManager' };
            const gen = new RSAKeyGenerator(mockCryptoEngine, mockMetadataManager, mockKeyWriter, customDirMgr);

            expect(gen.dirManager).toBe(customDirMgr);
        });
    });

    describe('generate', () => {
        beforeEach(() => {
            // Setup default mock responses
            mockCryptoEngine.generateKID.mockReturnValue('example-20260109-133000-abc123');
            mockCryptoEngine.generateKeyPair.mockResolvedValue({
                publicKey: '-----BEGIN PUBLIC KEY-----\nMOCK_PUBLIC_KEY\n-----END PUBLIC KEY-----',
                privateKey: '-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY\n-----END PRIVATE KEY-----'
            });
            mockDirManager.ensure.mockResolvedValue(undefined);
            mockKeyWriter.save.mockResolvedValue(undefined);
            mockMetadataManager.create.mockResolvedValue(undefined);
        });

        it('should ensure directories exist before generating', async () => {
            // Test: Directory creation happens first in the flow
            await generator.generate('example.com');

            expect(mockDirManager.ensure).toHaveBeenCalledWith('example.com');
            expect(mockDirManager.ensure).toHaveBeenCalledBefore(mockCryptoEngine.generateKID);
        });

        it('should generate a KID with the provided domain', async () => {
            // Test: KID generation receives correct domain
            await generator.generate('testdomain.com');

            expect(mockCryptoEngine.generateKID).toHaveBeenCalledWith('testdomain.com');
        });

        it('should generate a key pair using cryptoEngine', async () => {
            // Test: Key pair generation is called
            await generator.generate('example.com');

            expect(mockCryptoEngine.generateKeyPair).toHaveBeenCalledTimes(1);
        });

        it('should save keys using keyWriter with correct parameters', async () => {
            // Test: Keys are saved with domain, kid, and both key types
            const domain = 'example.com';
            const kid = 'example-20260109-133000-abc123';
            const keys = {
                publicKey: '-----BEGIN PUBLIC KEY-----\nPUBLIC\n-----END PUBLIC KEY-----',
                privateKey: '-----BEGIN PRIVATE KEY-----\nPRIVATE\n-----END PRIVATE KEY-----'
            };

            mockCryptoEngine.generateKID.mockReturnValue(kid);
            mockCryptoEngine.generateKeyPair.mockResolvedValue(keys);

            await generator.generate(domain);

            expect(mockKeyWriter.save).toHaveBeenCalledWith(
                domain,
                kid,
                keys.publicKey,
                keys.privateKey
            );
        });

        it('should create metadata with domain, kid, and timestamp', async () => {
            // Test: Metadata creation includes all required fields
            const domain = 'testdomain.com';
            const kid = 'testdomain-20260109-140000-xyz789';
            mockCryptoEngine.generateKID.mockReturnValue(kid);

            const beforeCall = new Date();
            await generator.generate(domain);
            const afterCall = new Date();

            expect(mockMetadataManager.create).toHaveBeenCalledTimes(1);
            const callArgs = mockMetadataManager.create.mock.calls[0];
            expect(callArgs[0]).toBe(domain);
            expect(callArgs[1]).toBe(kid);
            expect(callArgs[2]).toBeInstanceOf(Date);
            expect(callArgs[2].getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
            expect(callArgs[2].getTime()).toBeLessThanOrEqual(afterCall.getTime());
        });

        it('should return the generated KID', async () => {
            // Test: Function returns the KID for tracking
            const expectedKid = 'example-20260109-150000-def456';
            mockCryptoEngine.generateKID.mockReturnValue(expectedKid);

            const result = await generator.generate('example.com');

            expect(result).toBe(expectedKid);
        });

        it('should execute steps in correct order', async () => {
            // Test: Ensure proper sequence - dirs → kid → keypair → save → metadata
            await generator.generate('example.com');

            const ensureOrder = mockDirManager.ensure.mock.invocationCallOrder[0];
            const kidOrder = mockCryptoEngine.generateKID.mock.invocationCallOrder[0];
            const keyPairOrder = mockCryptoEngine.generateKeyPair.mock.invocationCallOrder[0];
            const saveOrder = mockKeyWriter.save.mock.invocationCallOrder[0];
            const metadataOrder = mockMetadataManager.create.mock.invocationCallOrder[0];

            expect(ensureOrder).toBeLessThan(kidOrder);
            expect(kidOrder).toBeLessThan(keyPairOrder);
            expect(keyPairOrder).toBeLessThan(saveOrder);
            expect(saveOrder).toBeLessThan(metadataOrder);
        });

        it('should handle multiple domains independently', async () => {
            // Test: Can generate keys for different domains
            await generator.generate('domain1.com');
            await generator.generate('domain2.com');

            expect(mockDirManager.ensure).toHaveBeenCalledWith('domain1.com');
            expect(mockDirManager.ensure).toHaveBeenCalledWith('domain2.com');
            expect(mockCryptoEngine.generateKID).toHaveBeenCalledWith('domain1.com');
            expect(mockCryptoEngine.generateKID).toHaveBeenCalledWith('domain2.com');
        });

        it('should generate unique keys for each call', async () => {
            // Test: Multiple generations create different KIDs
            mockCryptoEngine.generateKID
                .mockReturnValueOnce('example-20260109-100000-aaa')
                .mockReturnValueOnce('example-20260109-100001-bbb');

            const kid1 = await generator.generate('example.com');
            const kid2 = await generator.generate('example.com');

            expect(kid1).not.toBe(kid2);
            expect(mockCryptoEngine.generateKeyPair).toHaveBeenCalledTimes(2);
        });
    });

    describe('error handling', () => {
        it('should propagate directory creation errors', async () => {
            // Test: Errors from dirManager bubble up
            const error = new Error('Directory creation failed');
            mockDirManager.ensure.mockRejectedValue(error);

            await expect(generator.generate('example.com')).rejects.toThrow('Directory creation failed');
        });

        it('should propagate key generation errors', async () => {
            // Test: Errors from cryptoEngine bubble up
            const error = new Error('Key generation failed');
            mockDirManager.ensure.mockResolvedValue(undefined);
            mockCryptoEngine.generateKID.mockReturnValue('test-kid');
            mockCryptoEngine.generateKeyPair.mockRejectedValue(error);

            await expect(generator.generate('example.com')).rejects.toThrow('Key generation failed');
        });

        it('should propagate key writing errors', async () => {
            // Test: Errors from keyWriter bubble up
            const error = new Error('Failed to write keys');
            mockDirManager.ensure.mockResolvedValue(undefined);
            mockCryptoEngine.generateKID.mockReturnValue('test-kid');
            mockCryptoEngine.generateKeyPair.mockResolvedValue({ publicKey: 'pub', privateKey: 'priv' });
            mockKeyWriter.save.mockRejectedValue(error);

            await expect(generator.generate('example.com')).rejects.toThrow('Failed to write keys');
        });

        it('should propagate metadata creation errors', async () => {
            // Test: Errors from metadataManager bubble up
            const error = new Error('Metadata creation failed');
            mockDirManager.ensure.mockResolvedValue(undefined);
            mockCryptoEngine.generateKID.mockReturnValue('test-kid');
            mockCryptoEngine.generateKeyPair.mockResolvedValue({ publicKey: 'pub', privateKey: 'priv' });
            mockKeyWriter.save.mockResolvedValue(undefined);
            mockMetadataManager.create.mockRejectedValue(error);

            await expect(generator.generate('example.com')).rejects.toThrow('Metadata creation failed');
        });

        it('should not call subsequent steps if directory creation fails', async () => {
            // Test: Early failure prevents later operations
            mockDirManager.ensure.mockRejectedValue(new Error('Dir fail'));

            await expect(generator.generate('example.com')).rejects.toThrow();

            expect(mockCryptoEngine.generateKID).not.toHaveBeenCalled();
            expect(mockCryptoEngine.generateKeyPair).not.toHaveBeenCalled();
        });

        it('should not save keys if key generation fails', async () => {
            // Test: Failure in generation prevents file writes
            mockDirManager.ensure.mockResolvedValue(undefined);
            mockCryptoEngine.generateKID.mockReturnValue('test-kid');
            mockCryptoEngine.generateKeyPair.mockRejectedValue(new Error('Gen fail'));

            await expect(generator.generate('example.com')).rejects.toThrow();

            expect(mockKeyWriter.save).not.toHaveBeenCalled();
        });
    });

    describe('integration scenarios', () => {
        it('should complete full key generation lifecycle', async () => {
            // Test: End-to-end successful generation
            const domain = 'production.com';
            const kid = 'production-20260109-160000-prod123';
            const keys = {
                publicKey: '-----BEGIN PUBLIC KEY-----\nPROD_PUBLIC\n-----END PUBLIC KEY-----',
                privateKey: '-----BEGIN PRIVATE KEY-----\nPROD_PRIVATE\n-----END PRIVATE KEY-----'
            };

            mockCryptoEngine.generateKID.mockReturnValue(kid);
            mockCryptoEngine.generateKeyPair.mockResolvedValue(keys);

            const result = await generator.generate(domain);

            expect(result).toBe(kid);
            expect(mockDirManager.ensure).toHaveBeenCalledWith(domain);
            expect(mockKeyWriter.save).toHaveBeenCalledWith(domain, kid, keys.publicKey, keys.privateKey);
            expect(mockMetadataManager.create).toHaveBeenCalledWith(domain, kid, expect.any(Date));
        });

        it('should handle rapid sequential generations', async () => {
            // Test: Can handle burst of key generation requests
            mockCryptoEngine.generateKID
                .mockReturnValueOnce('kid-1')
                .mockReturnValueOnce('kid-2')
                .mockReturnValueOnce('kid-3');

            mockCryptoEngine.generateKeyPair.mockResolvedValue({
                publicKey: '-----BEGIN PUBLIC KEY-----\nKEY\n-----END PUBLIC KEY-----',
                privateKey: '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----'
            });

            const results = await Promise.all([
                generator.generate('example.com'),
                generator.generate('example.com'),
                generator.generate('example.com')
            ]);

            expect(results).toEqual(['kid-1', 'kid-2', 'kid-3']);
            expect(mockCryptoEngine.generateKeyPair).toHaveBeenCalledTimes(3);
        });

        it('should work with minimal valid dependencies', async () => {
            // Test: Generator works with basic mock implementations
            const minimalGen = new RSAKeyGenerator(
                { generateKID: () => 'minimal-kid', generateKeyPair: async () => ({ publicKey: 'pub', privateKey: 'priv' }) },
                { create: async () => { } },
                { save: async () => { } },
                { ensure: async () => { } }
            );

            const result = await minimalGen.generate('test.com');

            expect(result).toBe('minimal-kid');
        });
    });
});
