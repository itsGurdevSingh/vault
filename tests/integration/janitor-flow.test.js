import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import {
    setupTestEnvironment,
    cleanupTestEnvironment,
    createTestKeyPaths,
} from "./helpers/testSetup.js";
import { Janitor } from "../../src/domain/key-manager/modules/Janitor/janitor.js";
import { KeyFileJanitor } from "../../src/domain/key-manager/modules/Janitor/KeyFileJanitor.js";
import { KeyDeleter } from "../../src/domain/key-manager/modules/Janitor/KeyDeleter.js";
import { MetadataJanitor } from "../../src/domain/key-manager/modules/Janitor/MetadataJanitor.js";
import { ExpiredKeyReaper } from "../../src/domain/key-manager/modules/Janitor/ExpiredKeyReaper.js";
import { KeyPairGenerator } from "../../src/domain/key-manager/modules/generator/RSAKeyGenerator.js";
import { KeyWriter } from "../../src/domain/key-manager/modules/generator/KeyWriter.js";
import { DirManager } from "../../src/domain/key-manager/modules/generator/DirManager.js";
import { MetadataService } from "../../src/domain/key-manager/modules/metadata/MetadataService.js";
import { MetaFileStore } from "../../src/domain/key-manager/modules/metadata/metaFileStore.js";
import { CryptoEngine } from "../../src/infrastructure/cryptoEngine/CryptoEngine.js";
import { CryptoConfig } from "../../src/infrastructure/cryptoEngine/cryptoConfig.js";
import { KIDFactory } from "../../src/infrastructure/cryptoEngine/KIDFactory.js";
import { utils } from "../../src/infrastructure/cryptoEngine/utils.js";
import { Cache } from "../../src/utils/cache.js";

describe("Integration: Janitor Cleanup Flow", () => {
    let testPaths;
    let cryptoEngine;
    let keyPairGenerator;
    let metadataService;
    let janitor;
    let keyFileJanitor;
    let metadataJanitor;
    let expiredKeyReaper;
    let loaderCache;
    let builderCache;
    let signerCache;

    beforeAll(async () => {
        await setupTestEnvironment();
        testPaths = createTestKeyPaths();

        // Initialize CryptoEngine
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
        const metaFileStore = new MetaFileStore(testPaths, {
            writeFile: fs.writeFile,
            readFile: fs.readFile,
            unlink: fs.unlink,
            readdir: fs.readdir,
            mkdir: fs.mkdir,
            path: path,
        });
        metadataService = new MetadataService(metaFileStore);

        // Initialize generator
        keyPairGenerator = new KeyPairGenerator(
            cryptoEngine,
            metadataService,
            keyWriter,
            dirManager
        );

        // Initialize caches
        loaderCache = { private: new Cache(), public: new Cache() };
        builderCache = new Cache();
        signerCache = new Cache();

        // Initialize janitor components
        const keyDeleter = new KeyDeleter(testPaths);
        keyFileJanitor = new KeyFileJanitor(loaderCache, builderCache, signerCache, keyDeleter);
        metadataJanitor = new MetadataJanitor(metadataService);
        expiredKeyReaper = new ExpiredKeyReaper(keyFileJanitor, metadataJanitor);
        janitor = new Janitor(keyFileJanitor, metadataJanitor, expiredKeyReaper);
    });

    afterAll(async () => {
        await cleanupTestEnvironment();
    });

    beforeEach(() => {
        // Clear caches before each test
        loaderCache.private.clear();
        loaderCache.public.clear();
        builderCache.clear();
        signerCache.clear();
    });

    async function setupKey(domain) {
        const kid = await keyPairGenerator.generate(domain);
        return kid;
    }

    async function fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    describe("Key File Deletion", () => {
        it("should delete private key file and invalidate caches", async () => {
            const domain = "USER";
            const kid = await setupKey(domain);

            // Pre-populate caches
            loaderCache.private.set(kid, "cached-private-key");
            signerCache.set(kid, "cached-signer"); // KeyFileJanitor deletes by KID

            // ACT: Delete private key
            await janitor.deletePrivate(domain, kid);

            // ASSERT: File deleted
            const privateKeyPath = testPaths.privateKey(domain, kid);
            expect(await fileExists(privateKeyPath)).toBe(false);

            // ASSERT: Caches invalidated
            expect(loaderCache.private.get(kid)).toBeUndefined();
            expect(signerCache.get(kid)).toBeUndefined();
        });

        it("should delete public key file and invalidate caches", async () => {
            const domain = "SERVICE";
            const kid = await setupKey(domain);

            // Pre-populate caches
            loaderCache.public.set(kid, "cached-public-key");
            builderCache.set(kid, "cached-jwks"); // KeyFileJanitor deletes by KID

            // ACT: Delete public key
            await janitor.deletePublic(domain, kid);

            // ASSERT: File deleted
            const publicKeyPath = testPaths.publicKey(domain, kid);
            expect(await fileExists(publicKeyPath)).toBe(false);

            // ASSERT: Caches invalidated
            expect(loaderCache.public.get(kid)).toBeUndefined();
            expect(builderCache.get(kid)).toBeUndefined();
        });

        it("should handle deletion of non-existent private key gracefully", async () => {
            const domain = "GHOST";
            const fakeKid = "GHOST-20200101-120000-DEADBEEF";

            // ACT & ASSERT: Should not throw
            await expect(janitor.deletePrivate(domain, fakeKid)).resolves.toBeUndefined();
        });

        it("should handle deletion of non-existent public key gracefully", async () => {
            const domain = "PHANTOM";
            const fakeKid = "PHANTOM-20200101-120000-CAFEBABE";

            // ACT & ASSERT: Should not throw
            await expect(janitor.deletePublic(domain, fakeKid)).resolves.toBeUndefined();
        });
    });

    describe("Metadata Management", () => {
        it("should add expiry date to key metadata", async () => {
            const domain = "EXPIRY_TEST";
            const kid = await setupKey(domain);

            // ACT: Add expiry
            await janitor.addKeyExpiry(domain, kid);

            // ASSERT: Archived metadata has expiry - origin metadata is unchanged
            // addExpiry writes to archive directory, origin remains
            const archivedPath = testPaths.metaArchivedKeyFile(kid);
            expect(await fileExists(archivedPath)).toBe(true);

            // Read archived metadata directly
            const archivedMeta = JSON.parse(
                await fs.readFile(archivedPath, "utf-8")
            );
            expect(archivedMeta.expiredAt).toBeDefined();
            const expiryTime = new Date(archivedMeta.expiredAt).getTime();
            expect(expiryTime).toBeGreaterThan(Date.now());
        });

        it("should delete origin metadata file", async () => {
            const domain = "META_DELETE";
            const kid = await setupKey(domain);

            // Verify metadata exists
            const metaBefore = await metadataService.read(domain, kid);
            expect(metaBefore).toBeDefined();

            // ACT: Delete origin metadata
            await janitor.deleteOriginMetadata(domain, kid);

            // ASSERT: Origin metadata deleted
            const metaPath = testPaths.metaKeyFile(domain, kid);
            expect(await fileExists(metaPath)).toBe(false);
        });

        it("should delete archived metadata file", async () => {
            const domain = "ARCHIVE_DELETE";
            const kid = await setupKey(domain);

            // Add expiry to create archived metadata
            await janitor.addKeyExpiry(domain, kid);

            // Verify archived metadata exists
            const archivedPath = testPaths.metaArchivedKeyFile(kid);
            expect(await fileExists(archivedPath)).toBe(true);

            // ACT: Delete archived metadata
            await janitor.deleteArchivedMetadata(kid);

            // ASSERT: Archived metadata deleted
            expect(await fileExists(archivedPath)).toBe(false);
        });

        it("should handle deletion of non-existent metadata gracefully", async () => {
            const domain = "MISSING";
            const fakeKid = "MISSING-20200101-120000-BADC0FFE";

            // ACT & ASSERT: Should not throw
            await expect(janitor.deleteOriginMetadata(domain, fakeKid)).resolves.toBeUndefined();
            await expect(janitor.deleteArchivedMetadata(fakeKid)).resolves.toBeUndefined();
        });
    });

    describe("Expired Key Reaper", () => {
        it("should delete expired public keys and archived metadata", async () => {
            const domain = "EXPIRED_DOMAIN";
            const kid = await setupKey(domain);

            // Set expired date (1 hour ago)
            const expiredDate = new Date(Date.now() - 60 * 60 * 1000);
            await metadataService.addExpiry(domain, kid, expiredDate);

            // Verify files exist before cleanup
            const publicKeyPath = testPaths.publicKey(domain, kid);
            const archivedMetaPath = testPaths.metaArchivedKeyFile(kid);
            expect(await fileExists(publicKeyPath)).toBe(true);
            expect(await fileExists(archivedMetaPath)).toBe(true);

            // ACT: Run cleanup
            await janitor.cleanDomain();

            // ASSERT: Expired public key deleted
            expect(await fileExists(publicKeyPath)).toBe(false);

            // ASSERT: Archived metadata deleted
            expect(await fileExists(archivedMetaPath)).toBe(false);
        });

        it("should NOT delete non-expired keys", async () => {
            const domain = "ACTIVE_DOMAIN";
            const kid = await setupKey(domain);

            // Set future expiry date (1 hour from now)
            const futureDate = new Date(Date.now() + 60 * 60 * 1000);
            await metadataService.addExpiry(domain, kid, futureDate);

            // ACT: Run cleanup
            await janitor.cleanDomain();

            // ASSERT: Non-expired key still exists
            const publicKeyPath = testPaths.publicKey(domain, kid);
            expect(await fileExists(publicKeyPath)).toBe(true);
        });

        it("should handle cleanup with no expired keys gracefully", async () => {
            // ACT & ASSERT: Should not throw when no expired keys
            await expect(janitor.cleanDomain()).resolves.toBeUndefined();
        });

        it("should clean up multiple expired keys across domains", async () => {
            const domains = ["MULTI_A", "MULTI_B", "MULTI_C"];
            const kids = [];

            // Generate expired keys in multiple domains
            for (const domain of domains) {
                const kid = await setupKey(domain);
                const expiredDate = new Date(Date.now() - 60 * 60 * 1000);
                await metadataService.addExpiry(domain, kid, expiredDate);
                kids.push({ domain, kid });
            }

            // Verify all exist before cleanup
            for (const { domain, kid } of kids) {
                const publicKeyPath = testPaths.publicKey(domain, kid);
                expect(await fileExists(publicKeyPath)).toBe(true);
            }

            // ACT: Run cleanup
            await janitor.cleanDomain();

            // ASSERT: All expired keys deleted
            for (const { domain, kid } of kids) {
                const publicKeyPath = testPaths.publicKey(domain, kid);
                expect(await fileExists(publicKeyPath)).toBe(false);
            }
        });
    });

    describe("Multi-Domain Isolation", () => {
        it("should delete keys independently per domain", async () => {
            const domainA = "DOMAIN_A";
            const domainB = "DOMAIN_B";
            const kidA = await setupKey(domainA);
            const kidB = await setupKey(domainB);

            // ACT: Delete only domain A's private key
            await janitor.deletePrivate(domainA, kidA);

            // ASSERT: Domain A's private key deleted
            const privateKeyPathA = testPaths.privateKey(domainA, kidA);
            expect(await fileExists(privateKeyPathA)).toBe(false);

            // ASSERT: Domain B's keys untouched
            const privateKeyPathB = testPaths.privateKey(domainB, kidB);
            const publicKeyPathB = testPaths.publicKey(domainB, kidB);
            expect(await fileExists(privateKeyPathB)).toBe(true);
            expect(await fileExists(publicKeyPathB)).toBe(true);
        });

        it("should maintain separate cache invalidation per domain", async () => {
            const domainX = "DOMAIN_X";
            const domainY = "DOMAIN_Y";
            const kidX = await setupKey(domainX);
            const kidY = await setupKey(domainY);

            // Pre-populate caches for both domains (cache by KID, not domain)
            signerCache.set(kidX, "signer-x");
            signerCache.set(kidY, "signer-y");

            // ACT: Delete only domain X's private key
            await janitor.deletePrivate(domainX, kidX);

            // ASSERT: Only kidX's cache invalidated
            expect(signerCache.get(kidX)).toBeUndefined();
            expect(signerCache.get(kidY)).toBe("signer-y");
        });
    });

    describe("Error Handling", () => {
        it("should continue cleanup even if one deletion fails", async () => {
            const domain1 = "ERROR_DOMAIN_1";
            const domain2 = "ERROR_DOMAIN_2";
            const kid1 = await setupKey(domain1);
            const kid2 = await setupKey(domain2);

            // Set both as expired
            const expiredDate = new Date(Date.now() - 60 * 60 * 1000);
            await metadataService.addExpiry(domain1, kid1, expiredDate);
            await metadataService.addExpiry(domain2, kid2, expiredDate);

            // Manually delete kid1's public key to simulate partial failure
            const publicKeyPath1 = testPaths.publicKey(domain1, kid1);
            await fs.unlink(publicKeyPath1);

            // ACT: Run cleanup (should handle missing file gracefully)
            await expect(janitor.cleanDomain()).resolves.toBeUndefined();

            // ASSERT: kid2 still cleaned up successfully
            const publicKeyPath2 = testPaths.publicKey(domain2, kid2);
            expect(await fileExists(publicKeyPath2)).toBe(false);
        });
    });
});
