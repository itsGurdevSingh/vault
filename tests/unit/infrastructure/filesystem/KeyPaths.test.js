import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'path';

// Import the pathService module
const { pathService: KeyPaths } = await import('../../../../src/infrastructure/filesystem/pathService.js');

describe('KeyPaths', () => {
    const testDomain = 'test.local';
    const testKid = 'test-kid-123';
    const cwd = process.cwd();

    describe('base paths', () => {
        it('should generate base directory path for domain', () => {
            const result = KeyPaths.base(testDomain);

            expect(result).toBe(join(cwd, 'storage/keys', testDomain));
        });

        it('should include domain in base path', () => {
            const result = KeyPaths.base('testdomain');

            expect(result).toContain('testdomain');
        });

        it('should use storage/keys as base directory', () => {
            const result = KeyPaths.base(testDomain);

            expect(result).toContain(join('storage', 'keys'));
        });

        it('should handle domains with hyphens', () => {
            const result = KeyPaths.base('my-domain');

            expect(result).toContain('my-domain');
        });

        it('should handle domains with underscores', () => {
            const result = KeyPaths.base('my_domain');

            expect(result).toContain('my_domain');
        });
    });

    describe('private key paths', () => {
        it('should generate private key directory path', () => {
            const result = KeyPaths.privateDir(testDomain);

            expect(result).toBe(join(cwd, 'storage/keys', testDomain, 'private'));
        });

        it('should include private subdirectory', () => {
            const result = KeyPaths.privateDir(testDomain);

            expect(result).toContain('private');
        });

        it('should generate full private key file path', () => {
            const result = KeyPaths.privateKey(testDomain, testKid);

            expect(result).toBe(join(cwd, 'storage/keys', testDomain, 'private', `${testKid}.pem`));
        });

        it('should use .pem extension for private keys', () => {
            const result = KeyPaths.privateKey(testDomain, testKid);

            expect(result.endsWith('.pem')).toBe(true);
        });

        it('should include kid in private key filename', () => {
            const result = KeyPaths.privateKey(testDomain, 'my-kid');

            expect(result).toContain('my-kid.pem');
        });

        it('should handle different domain in private key path', () => {
            const result = KeyPaths.privateKey('anotherdomain', testKid);

            expect(result).toContain('anotherdomain');
        });
    });

    describe('public key paths', () => {
        it('should generate public key directory path', () => {
            const result = KeyPaths.publicDir(testDomain);

            expect(result).toBe(join(cwd, 'storage/keys', testDomain, 'public'));
        });

        it('should include public subdirectory', () => {
            const result = KeyPaths.publicDir(testDomain);

            expect(result).toContain('public');
        });

        it('should generate full public key file path', () => {
            const result = KeyPaths.publicKey(testDomain, testKid);

            expect(result).toBe(join(cwd, 'storage/keys', testDomain, 'public', `${testKid}.pem`));
        });

        it('should use .pem extension for public keys', () => {
            const result = KeyPaths.publicKey(testDomain, testKid);

            expect(result.endsWith('.pem')).toBe(true);
        });

        it('should include kid in public key filename', () => {
            const result = KeyPaths.publicKey(testDomain, 'public-kid');

            expect(result).toContain('public-kid.pem');
        });

        it('should handle different domain in public key path', () => {
            const result = KeyPaths.publicKey('test.org', testKid);

            expect(result).toContain('test.org');
        });
    });

    describe('origin metadata paths', () => {
        it('should generate metadata key directory path', () => {
            const result = KeyPaths.metaKeyDir(testDomain);

            expect(result).toBe(join(cwd, 'storage/metadata/keys', testDomain));
        });

        it('should use storage/metadata/keys as base', () => {
            const result = KeyPaths.metaKeyDir(testDomain);

            expect(result).toContain(join('storage', 'metadata', 'keys'));
        });

        it('should include domain in metadata directory', () => {
            const result = KeyPaths.metaKeyDir('meta.com');

            expect(result).toContain('meta.com');
        });

        it('should generate full metadata key file path', () => {
            const result = KeyPaths.metaKeyFile(testDomain, testKid);

            expect(result).toBe(join(cwd, 'storage/metadata/keys', testDomain, `${testKid}.meta`));
        });

        it('should use .meta extension for metadata files', () => {
            const result = KeyPaths.metaKeyFile(testDomain, testKid);

            expect(result.endsWith('.meta')).toBe(true);
        });

        it('should include kid in metadata filename', () => {
            const result = KeyPaths.metaKeyFile(testDomain, 'meta-kid');

            expect(result).toContain('meta-kid.meta');
        });
    });

    describe('archived metadata paths', () => {
        it('should generate archived metadata directory path', () => {
            const result = KeyPaths.metaArchivedDir();

            expect(result).toBe(join(cwd, 'storage/metadata/keys/archived'));
        });

        it('should use archived subdirectory', () => {
            const result = KeyPaths.metaArchivedDir();

            expect(result).toContain('archived');
        });

        it('should not require domain parameter for archived directory', () => {
            const result = KeyPaths.metaArchivedDir();

            expect(result).toBeDefined();
            expect(result).toContain(join('storage', 'metadata', 'keys', 'archived'));
        });

        it('should generate full archived metadata file path', () => {
            const result = KeyPaths.metaArchivedKeyFile(testKid);

            expect(result).toBe(join(cwd, 'storage/metadata/keys/archived', `${testKid}.meta`));
        });

        it('should use .meta extension for archived files', () => {
            const result = KeyPaths.metaArchivedKeyFile(testKid);

            expect(result.endsWith('.meta')).toBe(true);
        });

        it('should include kid in archived filename', () => {
            const result = KeyPaths.metaArchivedKeyFile('archived-kid');

            expect(result).toContain('archived-kid.meta');
        });

        it('should not include domain in archived path', () => {
            const result = KeyPaths.metaArchivedKeyFile(testKid);

            // Archived files are global, not domain-specific
            expect(result).not.toContain(testDomain);
        });
    });

    describe('path consistency', () => {
        it('should use consistent separators across all methods', () => {
            const paths = [
                KeyPaths.base(testDomain),
                KeyPaths.privateDir(testDomain),
                KeyPaths.publicDir(testDomain),
                KeyPaths.privateKey(testDomain, testKid),
                KeyPaths.publicKey(testDomain, testKid),
                KeyPaths.metaKeyDir(testDomain),
                KeyPaths.metaKeyFile(testDomain, testKid),
                KeyPaths.metaArchivedDir(),
                KeyPaths.metaArchivedKeyFile(testKid)
            ];

            // All paths should use the same path separator
            paths.forEach(path => {
                expect(path).toMatch(/[/\\]/); // Contains path separators
            });
        });

        it('should all paths start with current working directory', () => {
            const paths = [
                KeyPaths.base(testDomain),
                KeyPaths.privateKey(testDomain, testKid),
                KeyPaths.publicKey(testDomain, testKid),
                KeyPaths.metaKeyFile(testDomain, testKid),
                KeyPaths.metaArchivedKeyFile(testKid)
            ];

            paths.forEach(path => {
                expect(path).toContain(cwd);
            });
        });

        it('should differentiate between private and public key paths', () => {
            const privatePath = KeyPaths.privateKey(testDomain, testKid);
            const publicPath = KeyPaths.publicKey(testDomain, testKid);

            expect(privatePath).not.toBe(publicPath);
            expect(privatePath).toContain('private');
            expect(publicPath).toContain('public');
        });

        it('should differentiate between origin and archived metadata paths', () => {
            const originPath = KeyPaths.metaKeyFile(testDomain, testKid);
            const archivedPath = KeyPaths.metaArchivedKeyFile(testKid);

            expect(originPath).not.toBe(archivedPath);
            expect(archivedPath).toContain('archived');
        });
    });

    describe('special characters handling', () => {
        it('should handle kid with hyphens', () => {
            const kid = 'kid-with-hyphens-123';
            const result = KeyPaths.privateKey(testDomain, kid);

            expect(result).toContain(kid);
        });

        it('should handle kid with underscores', () => {
            const kid = 'kid_with_underscores_456';
            const result = KeyPaths.publicKey(testDomain, kid);

            expect(result).toContain(kid);
        });

        it('should handle kid with numbers', () => {
            const kid = '20240101-key-789';
            const result = KeyPaths.metaKeyFile(testDomain, kid);

            expect(result).toContain(kid);
        });

        it('should handle domain with port', () => {
            const domain = 'localhost:3000';
            const result = KeyPaths.base(domain);

            expect(result).toContain('localhost:3000');
        });
    });

    describe('object structure', () => {
        it('should export KeyPaths as an object', () => {
            expect(typeof KeyPaths).toBe('object');
        });

        it('should have all required methods', () => {
            expect(typeof KeyPaths.base).toBe('function');
            expect(typeof KeyPaths.privateDir).toBe('function');
            expect(typeof KeyPaths.publicDir).toBe('function');
            expect(typeof KeyPaths.privateKey).toBe('function');
            expect(typeof KeyPaths.publicKey).toBe('function');
            expect(typeof KeyPaths.metaKeyDir).toBe('function');
            expect(typeof KeyPaths.metaKeyFile).toBe('function');
            expect(typeof KeyPaths.metaArchivedDir).toBe('function');
            expect(typeof KeyPaths.metaArchivedKeyFile).toBe('function');
        });

        it('should have exactly 9 methods', () => {
            const methods = Object.keys(KeyPaths);
            expect(methods.length).toBe(9);
        });
    });
});
