import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyDirectory } from '../../../../../src/domain/key-manager/modules/loader/KeyDirectory.js';
import { readdir } from 'fs/promises';

// Mock fs/promises module
vi.mock('fs/promises', () => ({
    readdir: vi.fn()
}));

describe('KeyDirectory', () => {
    let keyDirectory;
    let mockPaths;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();

        // Create mock paths repository
        mockPaths = {
            privateDir: vi.fn((domain) => `/storage/keys/${domain}/private`),
            publicDir: vi.fn((domain) => `/storage/keys/${domain}/public`),
            metaKeyDir: vi.fn((domain) => `/storage/metadata/keys/${domain}`)
        };

        keyDirectory = new KeyDirectory(mockPaths);
    });

    describe('constructor', () => {
        it('should initialize with paths repository', () => {
            // Test: Verify KeyDirectory stores injected paths
            expect(keyDirectory.paths).toBe(mockPaths);
        });
    });

    describe('ensureDirectories', () => {
        it('should verify all required directories exist', async () => {
            // Test: Happy path - all directories exist
            const domain = 'testdomain';
            readdir.mockResolvedValue([]);

            await keyDirectory.ensureDirectories(domain);

            // Verify readdir was called for each directory
            expect(readdir).toHaveBeenCalledTimes(3);
            expect(readdir).toHaveBeenCalledWith('/storage/keys/testdomain/private');
            expect(readdir).toHaveBeenCalledWith('/storage/keys/testdomain/public');
            expect(readdir).toHaveBeenCalledWith('/storage/metadata/keys/testdomain');
        });

        it('should throw error when private directory does not exist', async () => {
            // Test: Error case - missing private directory
            const domain = 'testdomain';
            const enoentError = new Error('Directory not found');
            enoentError.code = 'ENOENT';

            readdir.mockRejectedValueOnce(enoentError);

            await expect(keyDirectory.ensureDirectories(domain))
                .rejects
                .toThrow('Key directories do not exist for domain: testdomain');
        });

        it('should throw error when public directory does not exist', async () => {
            // Test: Error case - missing public directory
            const domain = 'testdomain';
            const enoentError = new Error('Directory not found');
            enoentError.code = 'ENOENT';

            readdir
                .mockResolvedValueOnce([]) // private exists
                .mockRejectedValueOnce(enoentError); // public missing

            await expect(keyDirectory.ensureDirectories(domain))
                .rejects
                .toThrow('Key directories do not exist for domain: testdomain');
        });

        it('should throw error when metadata directory does not exist', async () => {
            // Test: Error case - missing metadata directory
            const domain = 'testdomain';
            const enoentError = new Error('Directory not found');
            enoentError.code = 'ENOENT';

            readdir
                .mockResolvedValueOnce([]) // private exists
                .mockResolvedValueOnce([]) // public exists
                .mockRejectedValueOnce(enoentError); // meta missing

            await expect(keyDirectory.ensureDirectories(domain))
                .rejects
                .toThrow('Key directories do not exist for domain: testdomain');
        });

        it('should propagate non-ENOENT errors', async () => {
            // Test: Other filesystem errors should be thrown as-is
            const domain = 'testdomain';
            const permissionError = new Error('Permission denied');
            permissionError.code = 'EACCES';

            readdir.mockRejectedValueOnce(permissionError);

            await expect(keyDirectory.ensureDirectories(domain))
                .rejects
                .toThrow('Permission denied');
        });

        it('should call paths methods with correct domain', async () => {
            // Test: Verify paths are resolved correctly for domain
            const domain = 'mycustomdomain';
            readdir.mockResolvedValue([]);

            await keyDirectory.ensureDirectories(domain);

            expect(mockPaths.privateDir).toHaveBeenCalledWith('mycustomdomain');
            expect(mockPaths.publicDir).toHaveBeenCalledWith('mycustomdomain');
            expect(mockPaths.metaKeyDir).toHaveBeenCalledWith('mycustomdomain');
        });
    });

    describe('listPrivateKids', () => {
        it('should list all private key KIDs from .pem files', async () => {
            // Test: Extract KIDs from private key filenames
            const domain = 'testdomain';
            readdir.mockResolvedValue([
                'kid1-20260109-143022-ABCD1234.pem',
                'kid2-20260109-143023-EFGH5678.pem',
                'kid3-20260109-143024-IJKL9012.pem'
            ]);

            const kids = await keyDirectory.listPrivateKids(domain);

            expect(kids).toEqual([
                'kid1-20260109-143022-ABCD1234',
                'kid2-20260109-143023-EFGH5678',
                'kid3-20260109-143024-IJKL9012'
            ]);
            expect(readdir).toHaveBeenCalledWith('/storage/keys/testdomain/private');
        });

        it('should filter out non-.pem files', async () => {
            // Test: Ignore files without .pem extension
            const domain = 'testdomain';
            readdir.mockResolvedValue([
                'kid1-20260109-143022-ABCD1234.pem',
                'README.txt',
                '.gitkeep',
                'kid2-20260109-143023-EFGH5678.pem',
                'backup.zip'
            ]);

            const kids = await keyDirectory.listPrivateKids(domain);

            expect(kids).toEqual([
                'kid1-20260109-143022-ABCD1234',
                'kid2-20260109-143023-EFGH5678'
            ]);
        });

        it('should return empty array when no .pem files exist', async () => {
            // Test: Handle empty directory
            const domain = 'testdomain';
            readdir.mockResolvedValue([]);

            const kids = await keyDirectory.listPrivateKids(domain);

            expect(kids).toEqual([]);
        });

        it('should return empty array when only non-.pem files exist', async () => {
            // Test: No valid key files in directory
            const domain = 'testdomain';
            readdir.mockResolvedValue(['README.txt', '.gitkeep', 'notes.md']);

            const kids = await keyDirectory.listPrivateKids(domain);

            expect(kids).toEqual([]);
        });

        it('should handle filenames with multiple dots correctly', async () => {
            // Test: Edge case - filenames with multiple periods
            const domain = 'testdomain';
            readdir.mockResolvedValue([
                'kid.with.dots-20260109-143022-ABCD1234.pem'
            ]);

            const kids = await keyDirectory.listPrivateKids(domain);

            expect(kids).toEqual(['kid.with.dots-20260109-143022-ABCD1234']);
        });
    });

    describe('listPublicKids', () => {
        it('should list all public key KIDs from .pem files', async () => {
            // Test: Extract KIDs from public key filenames
            const domain = 'testdomain';
            readdir.mockResolvedValue([
                'kid1-20260109-143022-ABCD1234.pem',
                'kid2-20260109-143023-EFGH5678.pem'
            ]);

            const kids = await keyDirectory.listPublicKids(domain);

            expect(kids).toEqual([
                'kid1-20260109-143022-ABCD1234',
                'kid2-20260109-143023-EFGH5678'
            ]);
            expect(readdir).toHaveBeenCalledWith('/storage/keys/testdomain/public');
        });

        it('should filter out non-.pem files', async () => {
            // Test: Ignore non-key files in public directory
            const domain = 'testdomain';
            readdir.mockResolvedValue([
                'kid1-20260109-143022-ABCD1234.pem',
                'index.html',
                'kid2-20260109-143023-EFGH5678.pem',
                '.DS_Store'
            ]);

            const kids = await keyDirectory.listPublicKids(domain);

            expect(kids).toEqual([
                'kid1-20260109-143022-ABCD1234',
                'kid2-20260109-143023-EFGH5678'
            ]);
        });

        it('should return empty array when directory is empty', async () => {
            // Test: Handle empty public directory
            const domain = 'testdomain';
            readdir.mockResolvedValue([]);

            const kids = await keyDirectory.listPublicKids(domain);

            expect(kids).toEqual([]);
        });

        it('should use correct paths method', async () => {
            // Test: Verify publicDir path is used
            const domain = 'anotherdomain';
            readdir.mockResolvedValue([]);

            await keyDirectory.listPublicKids(domain);

            expect(mockPaths.publicDir).toHaveBeenCalledWith('anotherdomain');
        });
    });

    describe('listMetadataKids', () => {
        it('should list all metadata KIDs from .json files', async () => {
            // Test: Extract KIDs from metadata JSON filenames
            const domain = 'testdomain';
            readdir.mockResolvedValue([
                'kid1-20260109-143022-ABCD1234.json',
                'kid2-20260109-143023-EFGH5678.json',
                'kid3-20260109-143024-IJKL9012.json'
            ]);

            const kids = await keyDirectory.listMetadataKids(domain);

            expect(kids).toEqual([
                'kid1-20260109-143022-ABCD1234',
                'kid2-20260109-143023-EFGH5678',
                'kid3-20260109-143024-IJKL9012'
            ]);
            expect(readdir).toHaveBeenCalledWith('/storage/metadata/keys/testdomain');
        });

        it('should filter out non-.json files', async () => {
            // Test: Ignore non-JSON files in metadata directory
            const domain = 'testdomain';
            readdir.mockResolvedValue([
                'kid1-20260109-143022-ABCD1234.json',
                'README.md',
                'kid2-20260109-143023-EFGH5678.json',
                'backup.tar.gz'
            ]);

            const kids = await keyDirectory.listMetadataKids(domain);

            expect(kids).toEqual([
                'kid1-20260109-143022-ABCD1234',
                'kid2-20260109-143023-EFGH5678'
            ]);
        });

        it('should return empty array when no metadata exists', async () => {
            // Test: Handle empty metadata directory
            const domain = 'testdomain';
            readdir.mockResolvedValue([]);

            const kids = await keyDirectory.listMetadataKids(domain);

            expect(kids).toEqual([]);
        });

        it('should handle JSON files with multiple dots', async () => {
            // Test: Edge case - complex JSON filenames
            const domain = 'testdomain';
            readdir.mockResolvedValue([
                'complex.kid.name-20260109-143022-ABCD1234.json'
            ]);

            const kids = await keyDirectory.listMetadataKids(domain);

            expect(kids).toEqual(['complex.kid.name-20260109-143022-ABCD1234']);
        });
    });

    describe('integration scenarios', () => {
        it('should work with different domain names', async () => {
            // Test: Multiple domains handled correctly
            const domains = ['domain1', 'domain2', 'domain-with-dashes'];
            readdir.mockResolvedValue([]);

            for (const domain of domains) {
                await keyDirectory.ensureDirectories(domain);
                expect(mockPaths.privateDir).toHaveBeenCalledWith(domain);
            }
        });

        it('should handle concurrent directory checks', async () => {
            // Test: Multiple simultaneous operations
            readdir.mockResolvedValue([]);

            const promises = [
                keyDirectory.ensureDirectories('domain1'),
                keyDirectory.ensureDirectories('domain2'),
                keyDirectory.ensureDirectories('domain3')
            ];

            await Promise.all(promises);

            expect(readdir).toHaveBeenCalledTimes(9); // 3 domains * 3 directories
        });

        it('should handle concurrent kid listings', async () => {
            // Test: Parallel listing operations
            readdir.mockResolvedValue(['kid1.pem', 'kid2.pem']);

            const [privateKids, publicKids, metaKids] = await Promise.all([
                keyDirectory.listPrivateKids('testdomain'),
                keyDirectory.listPublicKids('testdomain'),
                keyDirectory.listMetadataKids('testdomain')
            ]);

            expect(privateKids).toHaveLength(2);
            expect(publicKids).toHaveLength(2);
            expect(metaKids).toHaveLength(0); // .pem not .json
        });
    });
});
