import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import crypto from "crypto";
import {
    setupTestEnvironment,
    cleanupTestEnvironment,
    createTestKeyPaths,
} from "./helpers/testSetup.js";
import { KeyRegistry } from "../../src/domain/key-manager/modules/loader/KeyRegistry.js";
import { KeyDirectory } from "../../src/domain/key-manager/modules/loader/KeyDirectory.js";
import { KeyReader } from "../../src/domain/key-manager/modules/loader/KeyReader.js";
import { RSAKeyGenerator } from "../../src/domain/key-manager/modules/generator/RSAKeyGenerator.js";
import { KeyWriter } from "../../src/domain/key-manager/modules/generator/KeyWriter.js";
import { DirManager } from "../../src/domain/key-manager/modules/generator/DirManager.js";
import { MetadataService } from "../../src/domain/key-manager/modules/metadata/MetadataService.js";
import { MetadataFileStore } from "../../src/domain/key-manager/modules/metadata/metadataFileStore.js";
import { CryptoEngine } from "../../src/infrastructure/cryptoEngine/CryptoEngine.js";
import { CryptoConfig } from "../../src/infrastructure/cryptoEngine/cryptoConfig.js";
import { KIDFactory } from "../../src/infrastructure/cryptoEngine/KIDFactory.js";
import { pemToArrayBuffer, base64UrlEncode, assertPlainObject } from "../../src/infrastructure/cryptoEngine/utils.js";
import path from "path";

describe("Integration: Loader (Key Loading) Flow", () => {
    let testPaths;
    let cryptoEngine;
    let rsaKeyGenerator;
    let keyRegistry;
    let keyReader;
    let keyDirectory;
    let readerCache;

    beforeAll(async () => {
        await setupTestEnvironment();
        testPaths = createTestKeyPaths();

        // Initialize CryptoEngine
        const utils = { pemToArrayBuffer, base64UrlEncode, assertPlainObject };
        const kidFactory = new KIDFactory({ randomBytes: crypto.randomBytes.bind(crypto) });
        cryptoEngine = new CryptoEngine({
            cryptoModule: crypto,
            config: CryptoConfig,
            utils: utils,
            tokenBuilder: null,
            kidFactory: kidFactory,
        });

        // Initialize filesystem components
        const keyWriter = new KeyWriter(testPaths, fs.writeFile);
        const dirManager = new DirManager(testPaths, fs.mkdir);

        // Initialize metadata
        const metadataFileStore = new MetadataFileStore(testPaths, {
            writeFile: fs.writeFile,
            readFile: fs.readFile,
            unlink: fs.unlink,
            readdir: fs.readdir,
            mkdir: fs.mkdir,
            path: path,
        });
        const metadataService = new MetadataService(metadataFileStore);

        // Initialize key generator
        rsaKeyGenerator = new RSAKeyGenerator(
            cryptoEngine,
            metadataService,
            keyWriter,
            dirManager
        );

        // Initialize loader components
        keyDirectory = new KeyDirectory(testPaths, fs.readdir);

        // Create simple cache for KeyReader
        readerCache = {
            private: new Map(),
            public: new Map(),
            setPrivate(kid, pem) { this.private.set(kid, pem); },
            setPublic(kid, pem) { this.public.set(kid, pem); }
        };

        keyReader = new KeyReader(readerCache, testPaths, cryptoEngine);
        keyRegistry = new KeyRegistry({ directory: keyDirectory, reader: keyReader });
    });

    afterAll(async () => {
        await cleanupTestEnvironment();
    });

    /**
     * Helper: Generate keys for a domain
     */
    async function setupDomain(domain, count = 1) {
        const kids = [];
        for (let i = 0; i < count; i++) {
            const kid = await rsaKeyGenerator.generate(domain);
            kids.push(kid);
        }
        return kids;
    }

    describe("Public Key Loading", () => {
        it("should load single public key by KID", async () => {
            const domain = "LOAD_PUB_SINGLE";
            const [kid] = await setupDomain(domain, 1);

            // ACT: Load public key
            const pem = await keyRegistry.getPublicKey(kid);

            // ASSERT: PEM loaded correctly
            expect(pem).toBeDefined();
            expect(pem).toContain("-----BEGIN PUBLIC KEY-----");
            expect(pem).toContain("-----END PUBLIC KEY-----");
            expect(typeof pem).toBe("string");
        });

        it("should load all public keys for a domain as map", async () => {
            const domain = "LOAD_PUB_MAP";
            const kids = await setupDomain(domain, 3);

            // ACT: Load public key map
            const keyMap = await keyRegistry.getPublicKeyMap(domain);

            // ASSERT: Map contains all keys
            expect(Object.keys(keyMap).length).toBe(3);
            for (const kid of kids) {
                expect(keyMap[kid]).toBeDefined();
                expect(keyMap[kid]).toContain("-----BEGIN PUBLIC KEY-----");
            }
        });

        it("should list all public KIDs for a domain", async () => {
            const domain = "LIST_PUB_KIDS";
            const kids = await setupDomain(domain, 2);

            // ACT: List public KIDs
            const listedKids = await keyRegistry.getAllPublicKids(domain);

            // ASSERT: All KIDs listed
            expect(listedKids.length).toBe(2);
            expect(listedKids).toEqual(expect.arrayContaining(kids));
        });

        it("should return empty map for domain with no keys", async () => {
            const domain = "EMPTY_PUB_DOMAIN";

            // ARRANGE: Create empty directories
            await fs.mkdir(testPaths.publicDir(domain), { recursive: true });

            // ACT: Load key map
            const keyMap = await keyRegistry.getPublicKeyMap(domain);

            // ASSERT: Empty map
            expect(keyMap).toEqual({});
            expect(Object.keys(keyMap).length).toBe(0);
        });
    });

    describe("Private Key Loading", () => {
        it("should load single private key by KID", async () => {
            const domain = "LOAD_PVT_SINGLE";
            const [kid] = await setupDomain(domain, 1);

            // ACT: Load private key
            const pem = await keyRegistry.getPrivateKey(kid);

            // ASSERT: PEM loaded correctly
            expect(pem).toBeDefined();
            expect(pem).toContain("-----BEGIN PRIVATE KEY-----");
            expect(pem).toContain("-----END PRIVATE KEY-----");
            expect(typeof pem).toBe("string");
        });

        it("should load all private keys for a domain as map", async () => {
            const domain = "LOAD_PVT_MAP";
            const kids = await setupDomain(domain, 3);

            // ACT: Load private key map
            const keyMap = await keyRegistry.getPrivateKeyMap(domain);

            // ASSERT: Map contains all keys
            expect(Object.keys(keyMap).length).toBe(3);
            for (const kid of kids) {
                expect(keyMap[kid]).toBeDefined();
                expect(keyMap[kid]).toContain("-----BEGIN PRIVATE KEY-----");
            }
        });

        it("should list all private KIDs for a domain", async () => {
            const domain = "LIST_PVT_KIDS";
            const kids = await setupDomain(domain, 2);

            // ACT: List private KIDs
            const listedKids = await keyRegistry.getAllPrivateKids(domain);

            // ASSERT: All KIDs listed
            expect(listedKids.length).toBe(2);
            expect(listedKids).toEqual(expect.arrayContaining(kids));
        });
    });

    describe("Cache Behavior", () => {
        it("should cache public key PEM after first load", async () => {
            const domain = "CACHE_PUB_TEST";
            const [kid] = await setupDomain(domain, 1);

            // ACT: First load (cache miss)
            const pem1 = await keyRegistry.getPublicKey(kid);

            // ASSERT: Cached
            expect(readerCache.public.get(kid)).toBe(pem1);

            // ACT: Second load (cache hit)
            const pem2 = await keyRegistry.getPublicKey(kid);

            // ASSERT: Same object from cache
            expect(pem2).toBe(pem1);
        });

        it("should cache private key PEM after first load", async () => {
            const domain = "CACHE_PVT_TEST";
            const [kid] = await setupDomain(domain, 1);

            // ACT: First load (cache miss)
            const pem1 = await keyRegistry.getPrivateKey(kid);

            // ASSERT: Cached
            expect(readerCache.private.get(kid)).toBe(pem1);

            // ACT: Second load (cache hit)
            const pem2 = await keyRegistry.getPrivateKey(kid);

            // ASSERT: Same object from cache
            expect(pem2).toBe(pem1);
        });

        it("should return cached PEM even after file deletion", async () => {
            const domain = "CACHE_FILE_DELETE";
            const [kid] = await setupDomain(domain, 1);

            // ACT: First load (populates cache)
            const pem1 = await keyRegistry.getPublicKey(kid);

            // ACT: Delete public key file
            await fs.unlink(testPaths.publicKey(domain, kid));

            // ACT: Second load (cache hit, no filesystem access)
            const pem2 = await keyRegistry.getPublicKey(kid);

            // ASSERT: Still returns cached PEM
            expect(pem2).toBe(pem1);
            expect(pem2).toContain("-----BEGIN PUBLIC KEY-----");
        });

        it("should cache keys independently per KID", async () => {
            const domain = "CACHE_MULTI_KID";
            const kids = await setupDomain(domain, 3);

            // ACT: Load all keys
            const pem1 = await keyRegistry.getPublicKey(kids[0]);
            const pem2 = await keyRegistry.getPublicKey(kids[1]);
            const pem3 = await keyRegistry.getPublicKey(kids[2]);

            // ASSERT: Each KID cached separately
            expect(readerCache.public.get(kids[0])).toBe(pem1);
            expect(readerCache.public.get(kids[1])).toBe(pem2);
            expect(readerCache.public.get(kids[2])).toBe(pem3);
            expect(pem1).not.toBe(pem2);
            expect(pem2).not.toBe(pem3);
        });
    });

    describe("Multi-Domain Support", () => {
        it("should load keys from different domains independently", async () => {
            const domainA = "MULTI_DOMAIN_A";
            const domainB = "MULTI_DOMAIN_B";
            const kidsA = await setupDomain(domainA, 2);
            const kidsB = await setupDomain(domainB, 3);

            // ACT: Load keys from both domains
            const mapA = await keyRegistry.getPublicKeyMap(domainA);
            const mapB = await keyRegistry.getPublicKeyMap(domainB);

            // ASSERT: Correct counts
            expect(Object.keys(mapA).length).toBe(2);
            expect(Object.keys(mapB).length).toBe(3);

            // ASSERT: Domain isolation - no cross-contamination
            for (const kid of kidsA) {
                expect(mapA[kid]).toBeDefined();
                expect(mapB[kid]).toBeUndefined();
            }
            for (const kid of kidsB) {
                expect(mapB[kid]).toBeDefined();
                expect(mapA[kid]).toBeUndefined();
            }
        });

        it("should handle concurrent loads from different domains", async () => {
            const domainA = "CONCURRENT_A";
            const domainB = "CONCURRENT_B";
            const domainC = "CONCURRENT_C";
            await setupDomain(domainA, 1);
            await setupDomain(domainB, 2);
            await setupDomain(domainC, 1);

            // ACT: Concurrent loads
            const [mapA, mapB, mapC] = await Promise.all([
                keyRegistry.getPublicKeyMap(domainA),
                keyRegistry.getPublicKeyMap(domainB),
                keyRegistry.getPublicKeyMap(domainC),
            ]);

            // ASSERT: All loaded correctly
            expect(Object.keys(mapA).length).toBe(1);
            expect(Object.keys(mapB).length).toBe(2);
            expect(Object.keys(mapC).length).toBe(1);
        });
    });

    describe("Error Handling", () => {
        it("should throw error for non-existent KID", async () => {
            const fakeKid = "USER-20260101-120000-FAKEKID1";

            // ACT & ASSERT: Should throw
            await expect(async () => {
                await keyRegistry.getPublicKey(fakeKid);
            }).rejects.toThrow();
        });

        it("should handle missing domain directory gracefully", async () => {
            const domain = "NONEXISTENT_DOMAIN";

            // ACT & ASSERT: Should throw or return empty
            try {
                const keyMap = await keyRegistry.getPublicKeyMap(domain);
                // If it doesn't throw, should return empty
                expect(keyMap).toEqual({});
            } catch (error) {
                // Or it's acceptable to throw ENOENT
                expect(error.code).toBe("ENOENT");
            }
        });

        it("should handle corrupted PEM file gracefully", async () => {
            const domain = "CORRUPTED_PEM";
            const [kid] = await setupDomain(domain, 1);

            // ACT: Corrupt the public key file
            await fs.writeFile(
                testPaths.publicKey(domain, kid),
                "NOT A VALID PEM FILE",
                "utf8"
            );

            // Clear cache to force filesystem read
            readerCache.public.delete(kid);

            // ACT & ASSERT: Load should succeed (KeyReader doesn't validate PEM format)
            const pem = await keyRegistry.getPublicKey(kid);
            expect(pem).toBe("NOT A VALID PEM FILE");
        });
    });

    describe("Key Pair Consistency", () => {
        it("should load matching public and private keys for same KID", async () => {
            const domain = "KEYPAIR_TEST";
            const [kid] = await setupDomain(domain, 1);

            // ACT: Load both keys
            const publicPem = await keyRegistry.getPublicKey(kid);
            const privatePem = await keyRegistry.getPrivateKey(kid);

            // ASSERT: Both exist and have correct format
            expect(publicPem).toContain("-----BEGIN PUBLIC KEY-----");
            expect(privatePem).toContain("-----BEGIN PRIVATE KEY-----");

            // ASSERT: Can derive public key from private key (cryptographic check)
            const publicKeyFromPrivate = crypto.createPublicKey({
                key: privatePem,
                format: "pem",
            });
            const derivedPublicPem = publicKeyFromPrivate.export({
                type: "spki",
                format: "pem",
            });

            // Should match the stored public key
            expect(derivedPublicPem).toBe(publicPem);
        });
    });
});
