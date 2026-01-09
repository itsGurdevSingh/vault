/**
 * Integration Test: Key Lifecycle
 * 
 * Tests the complete lifecycle of a key from generation to storage to retrieval.
 * Uses REAL filesystem operations and REAL crypto - no mocks.
 * 
 * Flow tested:
 * 1. KeyPairGenerator generates RSA key pair (real crypto)
 * 2. DirManager creates directory structure
 * 3. KeyWriter saves keys to filesystem
 * 4. MetadataService creates metadata file
 * 5. KeyReader retrieves keys from filesystem
 * 6. Verify all files exist with correct content
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import crypto from 'crypto';
import { setupTestEnvironment, cleanupTestEnvironment, createTestKeyPaths, fileExists, readJsonFile, listFiles } from './helpers/testSetup.js';
import { KeyPairGenerator } from '../../src/domain/key-manager/modules/generator/RSAKeyGenerator.js';
import { KeyWriter } from '../../src/domain/key-manager/modules/generator/KeyWriter.js';
import { DirManager } from '../../src/domain/key-manager/modules/generator/DirManager.js';
import { KeyReader } from '../../src/domain/key-manager/modules/loader/KeyReader.js';
import { MetadataService } from '../../src/domain/key-manager/modules/metadata/MetadataService.js';
import { MetaFileStore } from '../../src/domain/key-manager/modules/metadata/metaFileStore.js';
import { CryptoEngine } from '../../src/infrastructure/cryptoEngine/CryptoEngine.js';
import { CryptoConfig } from '../../src/infrastructure/cryptoEngine/cryptoConfig.js';
import { KIDFactory } from '../../src/infrastructure/cryptoEngine/KIDFactory.js';
import { utils } from '../../src/infrastructure/cryptoEngine/utils.js';

describe('Integration: Key Lifecycle (Generate → Store → Retrieve)', () => {
    let testPaths;
    let cryptoEngine;
    let keyWriter;
    let dirManager;
    let keyReader;
    let metadataService;
    let keyPairGenerator;

    beforeAll(async () => {
        // Setup test environment
        await setupTestEnvironment();

        // Create test paths
        testPaths = createTestKeyPaths();

        // Initialize real CryptoEngine
        const kidFactory = new KIDFactory({ randomBytes: crypto.randomBytes.bind(crypto) });
        cryptoEngine = new CryptoEngine({
            cryptoModule: crypto,
            config: CryptoConfig,
            utils: utils,
            tokenBuilder: null, // Not needed for this test
            kidFactory: kidFactory
        });

        // Initialize components with real filesystem operations
        keyWriter = new KeyWriter(testPaths, writeFile);
        dirManager = new DirManager(testPaths, mkdir);

        // Initialize metadata service
        const metaFileStore = new MetaFileStore(testPaths, {
            writeFile,
            readFile,
            unlink,
            readdir: async (dir) => {
                const { readdir } = await import('fs/promises');
                return readdir(dir);
            },
            mkdir,
            path: { join: (await import('path')).join }
        });
        metadataService = new MetadataService(metaFileStore);

        // Initialize KeyPairGenerator
        keyPairGenerator = new KeyPairGenerator(
            cryptoEngine,
            metadataService,
            keyWriter,
            dirManager
        );

        // Initialize KeyReader with simple cache
        const simpleCache = {
            private: new Map(),
            public: new Map(),
            setPrivate(kid, pem) { this.private.set(kid, pem); },
            setPublic(kid, pem) { this.public.set(kid, pem); }
        };
        keyReader = new KeyReader(simpleCache, testPaths, cryptoEngine);
    });

    afterAll(async () => {
        // Cleanup test environment
        await cleanupTestEnvironment();
    });

    describe('Single Key Generation and Retrieval', () => {
        it('should generate key pair, store to filesystem, and retrieve successfully', async () => {
            const domain = 'USER';

            // Generate key pair (full flow)
            const kid = await keyPairGenerator.generate(domain);

            // Verify KID format (domain-YYYYMMDD-HHMMSS-HEX)
            expect(kid).toBeTruthy();
            expect(kid).toContain(domain);
            expect(kid).toMatch(/-[0-9]{8}-[0-9]{6}-[A-F0-9]{8}$/);

            // Verify directory structure created
            const privateKeyPath = testPaths.privateKey(domain, kid);
            const publicKeyPath = testPaths.publicKey(domain, kid);
            const metadataPath = testPaths.metaKeyFile(domain, kid);

            expect(await fileExists(privateKeyPath)).toBe(true);
            expect(await fileExists(publicKeyPath)).toBe(true);
            expect(await fileExists(metadataPath)).toBe(true);

            // Retrieve private key
            const retrievedPrivateKey = await keyReader.privateKey(kid);
            expect(retrievedPrivateKey).toBeTruthy();
            expect(retrievedPrivateKey).toContain('BEGIN PRIVATE KEY');
            expect(retrievedPrivateKey).toContain('END PRIVATE KEY');

            // Retrieve public key
            const retrievedPublicKey = await keyReader.publicKey(kid);
            expect(retrievedPublicKey).toBeTruthy();
            expect(retrievedPublicKey).toContain('BEGIN PUBLIC KEY');
            expect(retrievedPublicKey).toContain('END PUBLIC KEY');

            // Verify stored keys match retrieved keys
            const storedPrivate = await readFile(privateKeyPath, 'utf8');
            const storedPublic = await readFile(publicKeyPath, 'utf8');
            expect(retrievedPrivateKey).toBe(storedPrivate);
            expect(retrievedPublicKey).toBe(storedPublic);
        });

        it('should create metadata file with correct structure', async () => {
            const domain = 'SERVICE';
            const kid = await keyPairGenerator.generate(domain);

            // Read metadata file
            const metadataPath = testPaths.metaKeyFile(domain, kid);
            const metadata = await readJsonFile(metadataPath);

            // Verify metadata structure
            expect(metadata).toHaveProperty('kid', kid);
            expect(metadata).toHaveProperty('domain', domain);
            expect(metadata).toHaveProperty('createdAt');
            // expiresAt is undefined for new keys
            expect(metadata.expiresAt).toBeUndefined();

            // Verify createdAt is valid date
            const createdAt = new Date(metadata.createdAt);
            expect(createdAt.getTime()).not.toBeNaN();
            expect(createdAt.getTime()).toBeLessThanOrEqual(Date.now());
        });

        it('should handle different domain types', async () => {
            const specialDomains = [
                'USER',
                'SERVICE',
                'TEST'
            ];

            for (const domain of specialDomains) {
                const kid = await keyPairGenerator.generate(domain);

                // Verify files created
                expect(await fileExists(testPaths.privateKey(domain, kid))).toBe(true);
                expect(await fileExists(testPaths.publicKey(domain, kid))).toBe(true);
                expect(await fileExists(testPaths.metaKeyFile(domain, kid))).toBe(true);

                // Verify retrieval works
                const privateKey = await keyReader.privateKey(kid);
                expect(privateKey).toContain('BEGIN PRIVATE KEY');
            }
        });
    });

    describe('Multiple Keys Per Domain', () => {
        it('should store and retrieve multiple keys for same domain', async () => {
            const domain = 'USER';
            const keyCount = 3;
            const kids = [];

            // Generate multiple keys
            for (let i = 0; i < keyCount; i++) {
                const kid = await keyPairGenerator.generate(domain);
                kids.push(kid);
            }

            // Verify all keys exist
            for (const kid of kids) {
                expect(await fileExists(testPaths.privateKey(domain, kid))).toBe(true);
                expect(await fileExists(testPaths.publicKey(domain, kid))).toBe(true);
            }

            // Verify all keys are unique
            const uniqueKids = new Set(kids);
            expect(uniqueKids.size).toBe(keyCount);

            // Verify all keys can be retrieved
            for (const kid of kids) {
                const privateKey = await keyReader.privateKey(kid);
                const publicKey = await keyReader.publicKey(kid);

                expect(privateKey).toContain('BEGIN PRIVATE KEY');
                expect(publicKey).toContain('BEGIN PUBLIC KEY');
            }
        });

        it('should list all private key files for a domain', async () => {
            const domain = 'LIST_TEST';
            const keyCount = 3;

            // Generate keys
            for (let i = 0; i < keyCount; i++) {
                await keyPairGenerator.generate(domain);
            }

            // List private key files
            const privateDir = testPaths.privateDir(domain);
            const files = await listFiles(privateDir);

            expect(files.length).toBe(keyCount);
            files.forEach(file => {
                expect(file).toMatch(/\.pem$/);
            });
        });
    });

    describe('Multi-Domain Isolation', () => {
        it('should store keys for different domains independently', async () => {
            const domain1 = 'USER';
            const domain2 = 'SERVICE';
            const domain3 = 'TEST';

            const kid1 = await keyPairGenerator.generate(domain1);
            const kid2 = await keyPairGenerator.generate(domain2);
            const kid3 = await keyPairGenerator.generate(domain3);

            // Verify each domain has its own directory
            expect(await fileExists(testPaths.privateKey(domain1, kid1))).toBe(true);
            expect(await fileExists(testPaths.privateKey(domain2, kid2))).toBe(true);
            expect(await fileExists(testPaths.privateKey(domain3, kid3))).toBe(true);

            // Verify keys are in different directories
            const path1 = testPaths.privateKey(domain1, kid1);
            const path2 = testPaths.privateKey(domain2, kid2);
            const path3 = testPaths.privateKey(domain3, kid3);

            expect(path1).toContain(domain1);
            expect(path2).toContain(domain2);
            expect(path3).toContain(domain3);

            expect(path1).not.toContain(domain2);
            expect(path2).not.toContain(domain3);
        });

        it('should retrieve correct key for each domain', async () => {
            const domain1 = 'USER';
            const domain2 = 'SERVICE';

            const kid1 = await keyPairGenerator.generate(domain1);
            const kid2 = await keyPairGenerator.generate(domain2);

            // Retrieve keys
            const key1 = await keyReader.privateKey(kid1);
            const key2 = await keyReader.privateKey(kid2);

            // Keys should be different
            expect(key1).not.toBe(key2);
            expect(key1).toContain('BEGIN PRIVATE KEY');
            expect(key2).toContain('BEGIN PRIVATE KEY');
        });
    });

    describe('Directory Structure', () => {
        it('should create complete directory structure automatically', async () => {
            const domain = 'TEST';
            const kid = await keyPairGenerator.generate(domain);

            // Verify all directories exist
            const privateDir = testPaths.privateDir(domain);
            const publicDir = testPaths.publicDir(domain);
            const metaDir = testPaths.metaKeyDir(domain);

            expect(await fileExists(privateDir)).toBe(true);
            expect(await fileExists(publicDir)).toBe(true);
            expect(await fileExists(metaDir)).toBe(true);
        });

        it('should maintain separate private/public directories', async () => {
            const domain = 'SEPARATE_TEST';
            const kid = await keyPairGenerator.generate(domain);

            const privateFiles = await listFiles(testPaths.privateDir(domain));
            const publicFiles = await listFiles(testPaths.publicDir(domain));

            expect(privateFiles.length).toBe(1);
            expect(publicFiles.length).toBe(1);
            expect(privateFiles[0]).toBe(`${kid}.pem`);
            expect(publicFiles[0]).toBe(`${kid}.pem`);
        });
    });

    describe('Key Format Validation', () => {
        it('should generate keys in PEM format', async () => {
            const domain = 'SERVICE';
            const kid = await keyPairGenerator.generate(domain);

            const privateKey = await keyReader.privateKey(kid);
            const publicKey = await keyReader.publicKey(kid);

            // Validate PEM format
            expect(privateKey).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
            expect(privateKey).toMatch(/\n-----END PRIVATE KEY-----\n?$/);
            expect(publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----\n/);
            expect(publicKey).toMatch(/\n-----END PUBLIC KEY-----\n?$/);

            // Validate base64 content between markers
            const privateContent = privateKey.split('\n').slice(1, -2).join('');
            const publicContent = publicKey.split('\n').slice(1, -2).join('');

            expect(privateContent).toMatch(/^[A-Za-z0-9+/=]+$/);
            expect(publicContent).toMatch(/^[A-Za-z0-9+/=]+$/);
        });

        it('should generate RSA keys with correct modulus length', async () => {
            const domain = 'TEST';
            const kid = await keyPairGenerator.generate(domain);

            const publicKey = await keyReader.publicKey(kid);

            // Import key to verify properties
            const keyObject = crypto.createPublicKey(publicKey);
            const keyDetails = keyObject.export({ format: 'jwk' });

            // Verify RSA key type
            expect(keyDetails.kty).toBe('RSA');

            // Verify modulus length for 4096-bit key
            // 4096 bits = 512 bytes, base64url = ceil(512 * 4/3) = 683 chars
            expect(keyDetails.n.length).toBeGreaterThan(680);
            expect(keyDetails.n.length).toBeLessThan(690);
        });
    });

    describe('Key Reader Caching', () => {
        it('should cache private key after first read', async () => {
            const domain = 'USER';
            const kid = await keyPairGenerator.generate(domain);

            // First read - from filesystem
            const key1 = await keyReader.privateKey(kid);

            // Second read - should use cache
            const key2 = await keyReader.privateKey(kid);

            expect(key1).toBe(key2);
            expect(key1).toContain('BEGIN PRIVATE KEY');
        });

        it('should cache public key after first read', async () => {
            const domain = 'SERVICE';
            const kid = await keyPairGenerator.generate(domain);

            // First read
            const key1 = await keyReader.publicKey(kid);

            // Second read
            const key2 = await keyReader.publicKey(kid);

            expect(key1).toBe(key2);
            expect(key1).toContain('BEGIN PUBLIC KEY');
        });
    });

    describe('Error Handling', () => {
        it('should throw error when reading non-existent key', async () => {
            const fakeKid = 'nonexistent123';

            await expect(async () => {
                await keyReader.privateKey(fakeKid);
            }).rejects.toThrow();
        });

        it('should handle concurrent key generation for same domain', async () => {
            const domain = 'TEST';

            // Generate keys concurrently
            const promises = Array(5).fill(null).map(() =>
                keyPairGenerator.generate(domain)
            );

            const kids = await Promise.all(promises);

            // All should succeed and be unique
            expect(kids.length).toBe(5);
            const uniqueKids = new Set(kids);
            expect(uniqueKids.size).toBe(5);

            // All files should exist
            for (const kid of kids) {
                expect(await fileExists(testPaths.privateKey(domain, kid))).toBe(true);
            }
        });
    });
});
