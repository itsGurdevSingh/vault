import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetaFileStore } from '../../../../src/domain/key-manager/modules/metadata/metaFileStore.js';
import { writeFile, readFile, unlink, readdir, mkdir } from 'fs/promises';

vi.mock('fs/promises', () => ({
    writeFile: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn()
}));

describe('MetaFileStore', () => {
    let store;
    let mockPaths;
    let mockFs;

    beforeEach(() => {
        vi.clearAllMocks();

        mockPaths = {
            metaKeyFile: vi.fn((domain, kid) => `/storage/metadata/keys/${domain}/${kid}.json`),
            metaArchivedKeyFile: vi.fn(kid => `/storage/metadata/archived/${kid}.json`),
            metaArchivedDir: vi.fn(() => '/storage/metadata/archived')
        };

        mockFs = {
            writeFile,
            readFile,
            unlink,
            readdir,
            mkdir,
            path: { join: (...args) => args.join('/') }
        };

        store = new MetaFileStore(mockPaths, mockFs);
    });

    describe('constructor', () => {
        it('should initialize with paths and fsOps', () => {
            expect(store.paths).toBe(mockPaths);
            expect(store.fs).toBe(mockFs);
        });

        it('should throw if no paths provided', () => {
            expect(() => new MetaFileStore(null, mockFs)).toThrow('Meta paths must be provided');
        });

        it('should throw if paths is undefined', () => {
            expect(() => new MetaFileStore(undefined, mockFs)).toThrow('Meta paths must be provided');
        });

        it('should throw if no fsOps provided', () => {
            expect(() => new MetaFileStore(mockPaths, null)).toThrow('Filesystem operations must be provided');
        });

        it('should throw if fsOps is undefined', () => {
            expect(() => new MetaFileStore(mockPaths)).toThrow('Filesystem operations must be provided');
        });
    });

    describe('writeOrigin', () => {
        it('should write metadata to origin file', async () => {
            const meta = { kid: 'test-kid', domain: 'example.com', createdAt: '2024-01-01', expiredAt: null };
            writeFile.mockResolvedValue(undefined);

            await store.writeOrigin('example.com', 'test-kid', meta);

            expect(mockPaths.metaKeyFile).toHaveBeenCalledWith('example.com', 'test-kid');
            expect(writeFile).toHaveBeenCalledWith(
                '/storage/metadata/keys/example.com/test-kid.json',
                JSON.stringify(meta, null, 2),
                { mode: 0o644 }
            );
        });

        it('should return metadata after writing', async () => {
            const meta = { kid: 'kid', domain: 'domain.com' };
            writeFile.mockResolvedValue(undefined);

            const result = await store.writeOrigin('domain.com', 'kid', meta);

            expect(result).toBe(meta);
        });

        it('should format JSON with indentation', async () => {
            const meta = { kid: 'test' };
            writeFile.mockResolvedValue(undefined);

            await store.writeOrigin('domain.com', 'kid', meta);

            const jsonArg = writeFile.mock.calls[0][1];
            expect(jsonArg).toBe(JSON.stringify(meta, null, 2));
        });

        it('should set file mode to 0o644', async () => {
            writeFile.mockResolvedValue(undefined);

            await store.writeOrigin('domain.com', 'kid', {});

            expect(writeFile).toHaveBeenCalledWith(expect.any(String), expect.any(String), { mode: 0o644 });
        });
    });

    describe('readOrigin', () => {
        it('should read and parse metadata from origin file', async () => {
            const meta = { kid: 'test-kid', domain: 'example.com' };
            readFile.mockResolvedValue(JSON.stringify(meta));

            const result = await store.readOrigin('example.com', 'test-kid');

            expect(mockPaths.metaKeyFile).toHaveBeenCalledWith('example.com', 'test-kid');
            expect(readFile).toHaveBeenCalledWith('/storage/metadata/keys/example.com/test-kid.json', 'utf8');
            expect(result).toEqual(meta);
        });

        it('should return null if file not found', async () => {
            const error = new Error('File not found');
            error.code = 'ENOENT';
            readFile.mockRejectedValue(error);

            const result = await store.readOrigin('example.com', 'missing-kid');

            expect(result).toBeNull();
        });

        it('should throw non-ENOENT errors', async () => {
            const error = new Error('Permission denied');
            error.code = 'EACCES';
            readFile.mockRejectedValue(error);

            await expect(store.readOrigin('example.com', 'kid')).rejects.toThrow('Permission denied');
        });

        it('should parse JSON correctly', async () => {
            const meta = { kid: 'test', nested: { field: 'value' } };
            readFile.mockResolvedValue(JSON.stringify(meta));

            const result = await store.readOrigin('domain.com', 'kid');

            expect(result).toEqual(meta);
        });
    });

    describe('deleteOrigin', () => {
        it('should delete origin metadata file', async () => {
            unlink.mockResolvedValue(undefined);

            await store.deleteOrigin('example.com', 'test-kid');

            expect(mockPaths.metaKeyFile).toHaveBeenCalledWith('example.com', 'test-kid');
            expect(unlink).toHaveBeenCalledWith('/storage/metadata/keys/example.com/test-kid.json');
        });

        it('should ignore ENOENT errors', async () => {
            const error = new Error('File not found');
            error.code = 'ENOENT';
            unlink.mockRejectedValue(error);

            await expect(store.deleteOrigin('example.com', 'kid')).resolves.toBeUndefined();
        });

        it('should throw non-ENOENT errors', async () => {
            const error = new Error('Permission denied');
            error.code = 'EACCES';
            unlink.mockRejectedValue(error);

            await expect(store.deleteOrigin('example.com', 'kid')).rejects.toThrow('Permission denied');
        });
    });

    describe('writeArchive', () => {
        it('should create archive directory', async () => {
            mkdir.mockResolvedValue(undefined);
            writeFile.mockResolvedValue(undefined);

            await store.writeArchive('archived-kid', {});

            expect(mockPaths.metaArchivedDir).toHaveBeenCalled();
            expect(mkdir).toHaveBeenCalledWith('/storage/metadata/archived', { recursive: true });
        });

        it('should write metadata to archive file', async () => {
            const meta = { kid: 'archived-kid', expiredAt: '2024-12-31' };
            mkdir.mockResolvedValue(undefined);
            writeFile.mockResolvedValue(undefined);

            await store.writeArchive('archived-kid', meta);

            expect(mockPaths.metaArchivedKeyFile).toHaveBeenCalledWith('archived-kid');
            expect(writeFile).toHaveBeenCalledWith(
                '/storage/metadata/archived/archived-kid.json',
                JSON.stringify(meta, null, 2),
                { mode: 0o644 }
            );
        });

        it('should return metadata after writing', async () => {
            const meta = { kid: 'kid', expiredAt: '2024-01-01' };
            mkdir.mockResolvedValue(undefined);
            writeFile.mockResolvedValue(undefined);

            const result = await store.writeArchive('kid', meta);

            expect(result).toBe(meta);
        });
    });

    describe('readArchive', () => {
        it('should read and parse archived metadata', async () => {
            const meta = { kid: 'archived-kid', expiredAt: '2024-12-31' };
            readFile.mockResolvedValue(JSON.stringify(meta));

            const result = await store.readArchive('archived-kid');

            expect(mockPaths.metaArchivedKeyFile).toHaveBeenCalledWith('archived-kid');
            expect(result).toEqual(meta);
        });

        it('should return null if archive not found', async () => {
            const error = new Error('File not found');
            error.code = 'ENOENT';
            readFile.mockRejectedValue(error);

            const result = await store.readArchive('missing-kid');

            expect(result).toBeNull();
        });

        it('should throw non-ENOENT errors', async () => {
            const error = new Error('Read error');
            error.code = 'EIO';
            readFile.mockRejectedValue(error);

            await expect(store.readArchive('kid')).rejects.toThrow('Read error');
        });
    });

    describe('deleteArchive', () => {
        it('should delete archived metadata file', async () => {
            unlink.mockResolvedValue(undefined);

            await store.deleteArchive('archived-kid');

            expect(mockPaths.metaArchivedKeyFile).toHaveBeenCalledWith('archived-kid');
            expect(unlink).toHaveBeenCalledWith('/storage/metadata/archived/archived-kid.json');
        });

        it('should ignore ENOENT errors', async () => {
            const error = new Error('File not found');
            error.code = 'ENOENT';
            unlink.mockRejectedValue(error);

            await expect(store.deleteArchive('kid')).resolves.toBeUndefined();
        });

        it('should throw non-ENOENT errors', async () => {
            const error = new Error('Permission denied');
            error.code = 'EACCES';
            unlink.mockRejectedValue(error);

            await expect(store.deleteArchive('kid')).rejects.toThrow('Permission denied');
        });
    });

    describe('readAllArchives', () => {
        it('should read all archived metadata files', async () => {
            readdir.mockResolvedValue(['kid1.json', 'kid2.json']);
            readFile
                .mockResolvedValueOnce(JSON.stringify({ kid: 'kid1' }))
                .mockResolvedValueOnce(JSON.stringify({ kid: 'kid2' }));

            const result = await store.readAllArchives();

            expect(mockPaths.metaArchivedDir).toHaveBeenCalled();
            expect(readdir).toHaveBeenCalledWith('/storage/metadata/archived');
            expect(result).toEqual([{ kid: 'kid1' }, { kid: 'kid2' }]);
        });

        it('should return empty array if directory not found', async () => {
            const error = new Error('Directory not found');
            error.code = 'ENOENT';
            readdir.mockRejectedValue(error);

            const result = await store.readAllArchives();

            expect(result).toEqual([]);
        });

        it('should throw non-ENOENT errors', async () => {
            const error = new Error('Permission denied');
            error.code = 'EACCES';
            readdir.mockRejectedValue(error);

            await expect(store.readAllArchives()).rejects.toThrow('Permission denied');
        });

        it('should handle empty directory', async () => {
            readdir.mockResolvedValue([]);

            const result = await store.readAllArchives();

            expect(result).toEqual([]);
        });

        it('should parse JSON for each file', async () => {
            readdir.mockResolvedValue(['file1.json', 'file2.json', 'file3.json']);
            readFile
                .mockResolvedValueOnce('{"id": 1}')
                .mockResolvedValueOnce('{"id": 2}')
                .mockResolvedValueOnce('{"id": 3}');

            const result = await store.readAllArchives();

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ id: 1 });
            expect(result[1]).toEqual({ id: 2 });
            expect(result[2]).toEqual({ id: 3 });
        });
    });
});
