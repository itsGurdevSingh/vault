import { mkdir, rm, readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

const TEST_STORAGE_BASE = join(process.cwd(), 'storage-test');

export const testPaths = {
    base: TEST_STORAGE_BASE,
    keys: join(TEST_STORAGE_BASE, 'keys'),
    metadata: join(TEST_STORAGE_BASE, 'metadata', 'keys'),
    metadataArchived: join(TEST_STORAGE_BASE, 'metadata', 'keys', 'archived')
};

/**
 * Setup test environment - create test directories
 */
export async function setupTestEnvironment() {
    await mkdir(testPaths.keys, { recursive: true });
    await mkdir(testPaths.metadata, { recursive: true });
    await mkdir(testPaths.metadataArchived, { recursive: true });
}

/**
 * Cleanup test environment - remove all test files
 */
export async function cleanupTestEnvironment() {
    try {
        await rm(TEST_STORAGE_BASE, { recursive: true, force: true });
    } catch (err) {
        // Ignore if directory doesn't exist
        if (err.code !== 'ENOENT') {
            console.error('Cleanup error:', err);
        }
    }
}

/**
 * Create test-specific KeyPaths that point to test storage
 */
export function createTestKeyPaths() {
    const paths = {
        base(domain) {
            return join(testPaths.keys, domain);
        },
        privateDir(domain) {
            return join(paths.base(domain), 'private');
        },
        publicDir(domain) {
            return join(paths.base(domain), 'public');
        },
        privateKey(domain, kid) {
            return join(paths.privateDir(domain), `${kid}.pem`);
        },
        publicKey(domain, kid) {
            return join(paths.publicDir(domain), `${kid}.pem`);
        },
        metaKeyDir(domain) {
            return join(testPaths.metadata, domain);
        },
        metaKeyFile(domain, kid) {
            return join(paths.metaKeyDir(domain), `${kid}.meta`);
        },
        metaArchivedDir() {
            return testPaths.metadataArchived;
        },
        metaArchivedKeyFile(kid) {
            return join(paths.metaArchivedDir(), `${kid}.meta`);
        },
        // Aliases for compatibility with different naming conventions
        getPvtKeyDir(domain) {
            return paths.privateDir(domain);
        },
        getPubKeyDir(domain) {
            return paths.publicDir(domain);
        },
        getPvtKeyPath(domain, kid) {
            return paths.privateKey(domain, kid);
        },
        getPubKeyPath(domain, kid) {
            return paths.publicKey(domain, kid);
        },
        getMetaKeyDir(domain) {
            return paths.metaKeyDir(domain);
        },
        getMetaKeyPath(domain, kid) {
            return paths.metaKeyFile(domain, kid);
        }
    };
    return paths;
}

/**
 * Helper to check if file or directory exists
 */
export async function fileExists(filePath) {
    try {
        await stat(filePath);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Helper to read JSON file
 */
export async function readJsonFile(filePath) {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
}

/**
 * Helper to list files in directory
 */
export async function listFiles(dirPath) {
    try {
        return await readdir(dirPath);
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }
}
