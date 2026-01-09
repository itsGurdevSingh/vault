import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DirManager } from '../../../../src/domain/key-manager/modules/generator/DirManager.js';

describe('DirManager', () => {
    let mockPaths;
    let mockMkdir;
    let dirManager;

    beforeEach(() => {
        // Reset mocks before each test
        mockPaths = {
            privateDir: vi.fn((domain) => `/keys/${domain}/private`),
            publicDir: vi.fn((domain) => `/keys/${domain}/public`),
            metaKeyDir: vi.fn((domain) => `/metadata/keys/${domain}`)
        };

        mockMkdir = vi.fn().mockResolvedValue(undefined);

        dirManager = new DirManager(mockPaths, mockMkdir);
    });

    describe('constructor', () => {
        it('should initialize with paths repository', () => {
            // Test: Paths dependency is stored
            expect(dirManager.paths).toBe(mockPaths);
        });

        it('should initialize with mkdir function', () => {
            // Test: Mkdir function is stored
            expect(dirManager.mkdir).toBe(mockMkdir);
        });

        it('should accept paths as first parameter', () => {
            // Test: Paths repository dependency injection
            const customPaths = { custom: 'paths' };
            const dm = new DirManager(customPaths, mockMkdir);

            expect(dm.paths).toBe(customPaths);
        });

        it('should accept mkdir as second parameter', () => {
            // Test: Mkdir function dependency injection
            const customMkdir = vi.fn();
            const dm = new DirManager(mockPaths, customMkdir);

            expect(dm.mkdir).toBe(customMkdir);
        });
    });

    describe('ensure', () => {
        it('should create private directory for domain', async () => {
            // Test: Private key directory is created
            const domain = 'example.com';

            await dirManager.ensure(domain);

            expect(mockPaths.privateDir).toHaveBeenCalledWith(domain);
            expect(mockMkdir).toHaveBeenCalledWith(
                `/keys/${domain}/private`,
                { recursive: true }
            );
        });

        it('should create public directory for domain', async () => {
            // Test: Public key directory is created
            const domain = 'example.com';

            await dirManager.ensure(domain);

            expect(mockPaths.publicDir).toHaveBeenCalledWith(domain);
            expect(mockMkdir).toHaveBeenCalledWith(
                `/keys/${domain}/public`,
                { recursive: true }
            );
        });

        it('should create metadata directory for domain', async () => {
            // Test: Metadata directory is created
            const domain = 'example.com';

            await dirManager.ensure(domain);

            expect(mockPaths.metaKeyDir).toHaveBeenCalledWith(domain);
            expect(mockMkdir).toHaveBeenCalledWith(
                `/metadata/keys/${domain}`,
                { recursive: true }
            );
        });

        it('should create all three directories', async () => {
            // Test: All directory types are created
            await dirManager.ensure('example.com');

            expect(mockMkdir).toHaveBeenCalledTimes(3);
        });

        it('should use recursive flag for all directories', async () => {
            // Test: Recursive option ensures parent dirs are created
            await dirManager.ensure('example.com');

            const calls = mockMkdir.mock.calls;
            expect(calls[0][1]).toEqual({ recursive: true });
            expect(calls[1][1]).toEqual({ recursive: true });
            expect(calls[2][1]).toEqual({ recursive: true });
        });

        it('should handle different domains independently', async () => {
            // Test: Each domain gets its own directory structure
            await dirManager.ensure('domain1.com');
            await dirManager.ensure('domain2.com');

            expect(mockPaths.privateDir).toHaveBeenCalledWith('domain1.com');
            expect(mockPaths.privateDir).toHaveBeenCalledWith('domain2.com');
            expect(mockMkdir).toHaveBeenCalledTimes(6); // 3 dirs × 2 domains
        });

        it('should handle subdomain structures', async () => {
            // Test: Subdomains work correctly
            const domain = 'api.v2.example.com';

            await dirManager.ensure(domain);

            expect(mockPaths.privateDir).toHaveBeenCalledWith(domain);
            expect(mockPaths.publicDir).toHaveBeenCalledWith(domain);
            expect(mockPaths.metaKeyDir).toHaveBeenCalledWith(domain);
        });

        it('should create directories even if they already exist', async () => {
            // Test: Idempotent - safe to call multiple times
            mockMkdir.mockResolvedValue(undefined); // Simulates dir exists

            await dirManager.ensure('example.com');
            await dirManager.ensure('example.com');

            expect(mockMkdir).toHaveBeenCalledTimes(6); // 3 dirs × 2 calls
        });

        it('should wait for all directories to be created', async () => {
            // Test: Async operations are awaited
            let createCount = 0;
            mockMkdir.mockImplementation(() => {
                createCount++;
                return Promise.resolve();
            });

            await dirManager.ensure('example.com');

            expect(createCount).toBe(3);
        });
    });

    describe('error handling', () => {
        it('should propagate private directory creation errors', async () => {
            // Test: Errors from creating private dir bubble up
            const error = new Error('Failed to create private directory');
            mockMkdir.mockImplementation((path) => {
                if (path.includes('private')) {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });

            await expect(
                dirManager.ensure('example.com')
            ).rejects.toThrow('Failed to create private directory');
        });

        it('should propagate public directory creation errors', async () => {
            // Test: Errors from creating public dir bubble up
            const error = new Error('Failed to create public directory');
            mockMkdir.mockImplementation((path) => {
                if (path.includes('public')) {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });

            await expect(
                dirManager.ensure('example.com')
            ).rejects.toThrow('Failed to create public directory');
        });

        it('should propagate metadata directory creation errors', async () => {
            // Test: Errors from creating metadata dir bubble up
            const error = new Error('Failed to create metadata directory');
            mockMkdir.mockImplementation((path) => {
                if (path.includes('metadata')) {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });

            await expect(
                dirManager.ensure('example.com')
            ).rejects.toThrow('Failed to create metadata directory');
        });

        it('should handle permission errors', async () => {
            // Test: Permission denied errors are propagated
            const error = new Error('EACCES: permission denied');
            mockMkdir.mockRejectedValue(error);

            await expect(
                dirManager.ensure('example.com')
            ).rejects.toThrow('EACCES: permission denied');
        });

        it('should handle disk full errors', async () => {
            // Test: Disk space errors are propagated
            const error = new Error('ENOSPC: no space left on device');
            mockMkdir.mockRejectedValue(error);

            await expect(
                dirManager.ensure('example.com')
            ).rejects.toThrow('ENOSPC: no space left on device');
        });

        it('should handle path generation errors', async () => {
            // Test: Errors in path generation bubble up
            mockPaths.privateDir.mockImplementation(() => {
                throw new Error('Invalid path');
            });

            await expect(
                dirManager.ensure('example.com')
            ).rejects.toThrow('Invalid path');
        });

        it('should handle invalid domain characters', async () => {
            // Test: Path generator might reject invalid domains
            const invalidDomain = '../../../etc/passwd';
            mockPaths.privateDir.mockImplementation((domain) => {
                if (domain.includes('..')) {
                    throw new Error('Path traversal detected');
                }
                return `/keys/${domain}/private`;
            });

            await expect(
                dirManager.ensure(invalidDomain)
            ).rejects.toThrow('Path traversal detected');
        });
    });

    describe('integration scenarios', () => {
        it('should complete full directory setup successfully', async () => {
            // Test: End-to-end successful directory creation
            const domain = 'production.com';

            await dirManager.ensure(domain);

            expect(mockPaths.privateDir).toHaveBeenCalledWith(domain);
            expect(mockPaths.publicDir).toHaveBeenCalledWith(domain);
            expect(mockPaths.metaKeyDir).toHaveBeenCalledWith(domain);
            expect(mockMkdir).toHaveBeenCalledTimes(3);
        });

        it('should handle rapid sequential ensures', async () => {
            // Test: Multiple ensures can happen quickly
            await Promise.all([
                dirManager.ensure('domain1.com'),
                dirManager.ensure('domain2.com'),
                dirManager.ensure('domain3.com')
            ]);

            expect(mockMkdir).toHaveBeenCalledTimes(9); // 3 dirs × 3 domains
        });

        it('should work with real directory structure', async () => {
            // Test: Realistic path scenarios
            mockPaths.privateDir.mockImplementation((d) => `/var/app/storage/keys/${d}/private`);
            mockPaths.publicDir.mockImplementation((d) => `/var/app/storage/keys/${d}/public`);
            mockPaths.metaKeyDir.mockImplementation((d) => `/var/app/storage/metadata/keys/${d}`);

            await dirManager.ensure('api.example.com');

            expect(mockMkdir).toHaveBeenCalledWith(
                '/var/app/storage/keys/api.example.com/private',
                { recursive: true }
            );
            expect(mockMkdir).toHaveBeenCalledWith(
                '/var/app/storage/keys/api.example.com/public',
                { recursive: true }
            );
            expect(mockMkdir).toHaveBeenCalledWith(
                '/var/app/storage/metadata/keys/api.example.com',
                { recursive: true }
            );
        });

        it('should handle empty domain string', async () => {
            // Test: Edge case - empty domain
            mockPaths.privateDir.mockReturnValue('/keys//private');
            mockPaths.publicDir.mockReturnValue('/keys//public');
            mockPaths.metaKeyDir.mockReturnValue('/metadata/keys/');

            await dirManager.ensure('');

            expect(mockMkdir).toHaveBeenCalledTimes(3);
        });

        it('should handle domains with special characters', async () => {
            // Test: Domains with hyphens, dots, etc.
            const domain = 'sub-api.v2.example.co.uk';

            await dirManager.ensure(domain);

            expect(mockPaths.privateDir).toHaveBeenCalledWith(domain);
            expect(mockPaths.publicDir).toHaveBeenCalledWith(domain);
            expect(mockPaths.metaKeyDir).toHaveBeenCalledWith(domain);
        });

        it('should work when directories already exist', async () => {
            // Test: mkdir with recursive should handle existing dirs
            mockMkdir.mockResolvedValue(undefined); // No error even if exists

            await dirManager.ensure('existing-domain.com');

            expect(mockMkdir).toHaveBeenCalledTimes(3);
            // Should not throw
        });

        it('should maintain proper call order', async () => {
            // Test: All three mkdir calls happen (order may vary due to Promise.all)
            await dirManager.ensure('example.com');

            const paths = mockMkdir.mock.calls.map(call => call[0]);
            expect(paths).toContain('/keys/example.com/private');
            expect(paths).toContain('/keys/example.com/public');
            expect(paths).toContain('/metadata/keys/example.com');
        });
    });
});
