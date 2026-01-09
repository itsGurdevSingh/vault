import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyWriter } from '../../../../src/domain/key-manager/modules/generator/KeyWriter.js';

describe('KeyWriter', () => {
    let mockPaths;
    let mockWriteFile;
    let writer;

    beforeEach(() => {
        // Reset mocks before each test
        mockPaths = {
            privateKey: vi.fn((domain, kid) => `/keys/${domain}/private/${kid}.pem`),
            publicKey: vi.fn((domain, kid) => `/keys/${domain}/public/${kid}.pem`)
        };

        mockWriteFile = vi.fn().mockResolvedValue(undefined);

        writer = new KeyWriter(mockPaths, mockWriteFile);
    });

    describe('constructor', () => {
        it('should initialize with paths repository', () => {
            // Test: Paths dependency is stored
            expect(writer.paths).toBe(mockPaths);
        });

        it('should initialize with writeFile function', () => {
            // Test: WriteFile function is stored
            expect(writer.writeFile).toBe(mockWriteFile);
        });

        it('should accept paths as first parameter', () => {
            // Test: Paths repository dependency injection
            const customPaths = { custom: 'paths' };
            const w = new KeyWriter(customPaths, mockWriteFile);

            expect(w.paths).toBe(customPaths);
        });

        it('should accept writeFile as second parameter', () => {
            // Test: WriteFile function dependency injection
            const customWrite = vi.fn();
            const w = new KeyWriter(mockPaths, customWrite);

            expect(w.writeFile).toBe(customWrite);
        });
    });

    describe('save', () => {
        it('should save private key to correct path', async () => {
            // Test: Private key is written to paths.privateKey location
            const domain = 'example.com';
            const kid = 'example-20260109-133000-abc123';
            const privateKey = '-----BEGIN PRIVATE KEY-----\nPRIVATE_DATA\n-----END PRIVATE KEY-----';

            await writer.save(domain, kid, 'public-key', privateKey);

            expect(mockPaths.privateKey).toHaveBeenCalledWith(domain, kid);
            expect(mockWriteFile).toHaveBeenCalledWith(
                `/keys/${domain}/private/${kid}.pem`,
                privateKey,
                { mode: 0o600 }
            );
        });

        it('should save public key to correct path', async () => {
            // Test: Public key is written to paths.publicKey location
            const domain = 'example.com';
            const kid = 'example-20260109-133000-abc123';
            const publicKey = '-----BEGIN PUBLIC KEY-----\nPUBLIC_DATA\n-----END PUBLIC KEY-----';

            await writer.save(domain, kid, publicKey, 'private-key');

            expect(mockPaths.publicKey).toHaveBeenCalledWith(domain, kid);
            expect(mockWriteFile).toHaveBeenCalledWith(
                `/keys/${domain}/public/${kid}.pem`,
                publicKey,
                { mode: 0o644 }
            );
        });

        it('should use restrictive permissions for private key (0o600)', async () => {
            // Test: Private keys get owner-only read/write permissions
            await writer.save('example.com', 'test-kid', 'pub', 'priv');

            const privateCall = mockWriteFile.mock.calls.find(call =>
                call[0].includes('private')
            );
            expect(privateCall[2]).toEqual({ mode: 0o600 });
        });

        it('should use readable permissions for public key (0o644)', async () => {
            // Test: Public keys get world-readable permissions
            await writer.save('example.com', 'test-kid', 'pub', 'priv');

            const publicCall = mockWriteFile.mock.calls.find(call =>
                call[0].includes('public')
            );
            expect(publicCall[2]).toEqual({ mode: 0o644 });
        });

        it('should save both keys in single operation', async () => {
            // Test: Both private and public keys are written
            await writer.save('example.com', 'test-kid', 'public-content', 'private-content');

            expect(mockWriteFile).toHaveBeenCalledTimes(2);
        });

        it('should handle different domains', async () => {
            // Test: Paths are generated for each domain correctly
            await writer.save('domain1.com', 'kid-1', 'pub1', 'priv1');
            await writer.save('domain2.com', 'kid-2', 'pub2', 'priv2');

            expect(mockPaths.privateKey).toHaveBeenCalledWith('domain1.com', 'kid-1');
            expect(mockPaths.privateKey).toHaveBeenCalledWith('domain2.com', 'kid-2');
        });

        it('should handle different KIDs', async () => {
            // Test: Each KID gets unique file paths
            await writer.save('example.com', 'kid-001', 'pub1', 'priv1');
            await writer.save('example.com', 'kid-002', 'pub2', 'priv2');

            expect(mockPaths.privateKey).toHaveBeenCalledWith('example.com', 'kid-001');
            expect(mockPaths.privateKey).toHaveBeenCalledWith('example.com', 'kid-002');
        });

        it('should write exact key content without modification', async () => {
            // Test: Keys are written as-is, no transformation
            const publicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----';
            const privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAo...\n-----END PRIVATE KEY-----';

            await writer.save('example.com', 'test-kid', publicKey, privateKey);

            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('private'),
                privateKey,
                expect.any(Object)
            );
            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('public'),
                publicKey,
                expect.any(Object)
            );
        });

        it('should wait for both file writes to complete', async () => {
            // Test: Async operations are properly awaited
            let writeCount = 0;
            mockWriteFile.mockImplementation(() => {
                writeCount++;
                return Promise.resolve();
            });

            await writer.save('example.com', 'test-kid', 'pub', 'priv');

            expect(writeCount).toBe(2);
        });
    });

    describe('error handling', () => {
        it('should propagate private key write errors', async () => {
            // Test: Errors from writing private key bubble up
            const error = new Error('Failed to write private key');
            mockWriteFile.mockImplementation((path) => {
                if (path.includes('private')) {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });

            await expect(
                writer.save('example.com', 'test-kid', 'pub', 'priv')
            ).rejects.toThrow('Failed to write private key');
        });

        it('should propagate public key write errors', async () => {
            // Test: Errors from writing public key bubble up
            const error = new Error('Failed to write public key');
            mockWriteFile.mockImplementation((path) => {
                if (path.includes('public')) {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });

            await expect(
                writer.save('example.com', 'test-kid', 'pub', 'priv')
            ).rejects.toThrow('Failed to write public key');
        });

        it('should handle permission errors', async () => {
            // Test: Permission denied errors are propagated
            const error = new Error('EACCES: permission denied');
            mockWriteFile.mockRejectedValue(error);

            await expect(
                writer.save('example.com', 'test-kid', 'pub', 'priv')
            ).rejects.toThrow('EACCES: permission denied');
        });

        it('should handle disk full errors', async () => {
            // Test: Disk space errors are propagated
            const error = new Error('ENOSPC: no space left on device');
            mockWriteFile.mockRejectedValue(error);

            await expect(
                writer.save('example.com', 'test-kid', 'pub', 'priv')
            ).rejects.toThrow('ENOSPC: no space left on device');
        });

        it('should handle path generation errors', async () => {
            // Test: Errors in path generation bubble up
            mockPaths.privateKey.mockImplementation(() => {
                throw new Error('Invalid path');
            });

            await expect(
                writer.save('example.com', 'test-kid', 'pub', 'priv')
            ).rejects.toThrow('Invalid path');
        });
    });

    describe('integration scenarios', () => {
        it('should complete full save operation successfully', async () => {
            // Test: End-to-end successful save
            const domain = 'production.com';
            const kid = 'production-20260109-160000-prod123';
            const publicKey = '-----BEGIN PUBLIC KEY-----\nPROD_PUB\n-----END PUBLIC KEY-----';
            const privateKey = '-----BEGIN PRIVATE KEY-----\nPROD_PRIV\n-----END PRIVATE KEY-----';

            await writer.save(domain, kid, publicKey, privateKey);

            expect(mockPaths.privateKey).toHaveBeenCalledWith(domain, kid);
            expect(mockPaths.publicKey).toHaveBeenCalledWith(domain, kid);
            expect(mockWriteFile).toHaveBeenCalledTimes(2);
        });

        it('should handle rapid sequential saves', async () => {
            // Test: Multiple saves can happen quickly
            await Promise.all([
                writer.save('example.com', 'kid-1', 'pub1', 'priv1'),
                writer.save('example.com', 'kid-2', 'pub2', 'priv2'),
                writer.save('example.com', 'kid-3', 'pub3', 'priv3')
            ]);

            expect(mockWriteFile).toHaveBeenCalledTimes(6); // 2 files × 3 saves
        });

        it('should work with real-looking key formats', async () => {
            // Test: Realistic RSA key formats
            const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo
4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u
+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh
kd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ
0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg
cKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbc
mwIDAQAB
-----END PUBLIC KEY-----`;

            const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC7VJTUt9Us8cKj
MzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu
NMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ
qgtzJ6GR3eqoYSW9b9UMvkBpZODSctWSNGj3P7jRFDO5VoTwCQAWbFnOjDfH5Ulg
p2PKSQnSJP3AJLQNFNe7br1XbrhV//eO+t51mIpGSDCUv3E0DDFcWDTH9cXDTTlR
ZVEiR2BwpZOOkE/Z0/BVnhZYL71oZV34bKfWjQIt6V/isSMahdg==
-----END PRIVATE KEY-----`;

            await writer.save('example.com', 'real-kid', publicKey, privateKey);

            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.any(String),
                privateKey,
                { mode: 0o600 }
            );
            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.any(String),
                publicKey,
                { mode: 0o644 }
            );
        });

        it('should handle empty domain strings', async () => {
            // Test: Edge case - empty domain
            mockPaths.privateKey.mockReturnValue('/keys//private/kid.pem');
            mockPaths.publicKey.mockReturnValue('/keys//public/kid.pem');

            await writer.save('', 'test-kid', 'pub', 'priv');

            expect(mockPaths.privateKey).toHaveBeenCalledWith('', 'test-kid');
        });

        it('should handle special characters in domain', async () => {
            // Test: Domains with special characters
            const domain = 'sub-domain.example.co.uk';
            await writer.save(domain, 'test-kid', 'pub', 'priv');

            expect(mockPaths.privateKey).toHaveBeenCalledWith(domain, 'test-kid');
            expect(mockPaths.publicKey).toHaveBeenCalledWith(domain, 'test-kid');
        });
    });
});
