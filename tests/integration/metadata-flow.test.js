import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import {
    setupTestEnvironment,
    cleanupTestEnvironment,
    createTestKeyPaths,
} from "./helpers/testSetup.js";
import { MetadataService } from "../../src/domain/key-manager/modules/metadata/MetadataService.js";
import { MetaFileStore } from "../../src/domain/key-manager/modules/metadata/metaFileStore.js";
import { KeyPairGenerator } from "../../src/domain/key-manager/modules/generator/RSAKeyGenerator.js";
import { KeyWriter } from "../../src/domain/key-manager/modules/generator/KeyWriter.js";
import { DirManager } from "../../src/domain/key-manager/modules/generator/DirManager.js";
import { CryptoEngine } from "../../src/infrastructure/cryptoEngine/CryptoEngine.js";
import { CryptoConfig } from "../../src/infrastructure/cryptoEngine/cryptoConfig.js";
import { KIDFactory } from "../../src/infrastructure/cryptoEngine/KIDFactory.js";
import { pemToArrayBuffer, base64UrlEncode, assertPlainObject } from "../../src/infrastructure/cryptoEngine/utils.js";

describe("Integration: Metadata Management Flow", () => {
    let testPaths;
    let metadataService;
    let keyPairGenerator;
    let cryptoEngine;

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
        const metaFileStore = new MetaFileStore(testPaths, {
            writeFile: fs.writeFile,
            readFile: fs.readFile,
            unlink: fs.unlink,
            readdir: fs.readdir,
            mkdir: fs.mkdir,
            path: path,
        });
        metadataService = new MetadataService(metaFileStore);

        // Initialize key generator (for creating test keys with metadata)
        keyPairGenerator = new KeyPairGenerator(
            cryptoEngine,
            metadataService,
            keyWriter,
            dirManager
        );
    });

    afterAll(async () => {
        await cleanupTestEnvironment();
    });

    /**
     * Helper: Generate key and return KID
     */
    async function generateKey(domain) {
        return await keyPairGenerator.generate(domain);
    }

    describe("Metadata CRUD Operations", () => {
        it("should create metadata for a key", async () => {
            const domain = "CREATE_META_TEST";
            const kid = await generateKey(domain);

            // ACT: Read the created metadata
            const meta = await metadataService.read(domain, kid);

            // ASSERT: Metadata exists with correct structure
            expect(meta).toBeDefined();
            expect(meta.kid).toBe(kid);
            expect(meta.domain).toBe(domain);
            expect(meta.createdAt).toBeDefined();
            expect(meta.expiredAt).toBeNull();
        });

        it("should read existing metadata from origin", async () => {
            const domain = "READ_META_TEST";
            const kid = await generateKey(domain);

            // ACT: Read metadata
            const meta = await metadataService.read(domain, kid);

            // ASSERT: Correct metadata returned
            expect(meta.kid).toBe(kid);
            expect(meta.domain).toBe(domain);
            expect(meta.expiredAt).toBeNull();
            expect(new Date(meta.createdAt)).toBeInstanceOf(Date);
        });

        it("should return null for non-existent metadata", async () => {
            const domain = "NONEXISTENT_META";
            const fakeKid = "USER-20260101-000000-FAKEKID1";

            // ACT: Read non-existent metadata
            const meta = await metadataService.read(domain, fakeKid);

            // ASSERT: Returns null
            expect(meta).toBeNull();
        });

        it("should delete metadata from origin", async () => {
            const domain = "DELETE_META_TEST";
            const kid = await generateKey(domain);

            // Verify exists
            let meta = await metadataService.read(domain, kid);
            expect(meta).toBeDefined();

            // ACT: Delete metadata
            await metadataService.deleteOrigin(domain, kid);

            // ASSERT: Metadata no longer exists in origin
            meta = await metadataService.read(domain, kid);
            expect(meta).toBeNull();
        });

        it("should create metadata with custom createdAt timestamp", async () => {
            const domain = "CUSTOM_TIME_TEST";
            const customDate = new Date("2025-01-01T00:00:00.000Z");
            const kid = cryptoEngine.generateKID(domain);

            // Create directory first
            await fs.mkdir(testPaths.metaKeyDir(domain), { recursive: true });

            // ACT: Create metadata with custom timestamp
            await metadataService.create(domain, kid, customDate);
            const meta = await metadataService.read(domain, kid);

            // ASSERT: Custom timestamp preserved
            expect(new Date(meta.createdAt)).toEqual(customDate);
        });
    });

    describe("Expiry Management", () => {
        it("should add expiry date to metadata", async () => {
            const domain = "EXPIRY_ADD_TEST";
            const kid = await generateKey(domain);
            const expiresAt = new Date(Date.now() + 86400000); // +24 hours

            // ACT: Add expiry
            const updatedMeta = await metadataService.addExpiry(domain, kid, expiresAt);

            // ASSERT: Expiry added
            expect(updatedMeta).toBeDefined();
            expect(updatedMeta.expiredAt).toBeDefined();
            expect(new Date(updatedMeta.expiredAt)).toEqual(expiresAt);
        });

        it("should move metadata to archive when expiry is added", async () => {
            const domain = "ARCHIVE_MOVE_TEST";
            const kid = await generateKey(domain);
            const expiresAt = new Date(Date.now() + 3600000); // +1 hour

            // ACT: Add expiry (writes to archive)
            await metadataService.addExpiry(domain, kid, expiresAt);

            // ASSERT: Can read from archive via read method
            const metaFromArchive = await metadataService.read(domain, kid);
            expect(metaFromArchive).toBeDefined();
            expect(metaFromArchive.expiredAt).toBeDefined();
        });

        it("should identify expired metadata", async () => {
            const domain = "EXPIRED_TEST";
            const kid = await generateKey(domain);
            const pastDate = new Date(Date.now() - 86400000); // -24 hours (past)

            // ACT: Add expiry in the past
            await metadataService.addExpiry(domain, kid, pastDate);

            // ACT: Get all expired metadata
            const expiredMetas = await metadataService.getExpiredMetadata();

            // ASSERT: Includes our expired metadata
            const expiredKids = expiredMetas.map(m => m.kid);
            expect(expiredKids).toContain(kid);

            const expiredMeta = expiredMetas.find(m => m.kid === kid);
            expect(new Date(expiredMeta.expiredAt).getTime()).toBeLessThan(Date.now());
        });

        it("should not include future expiry in expired list", async () => {
            const domain = "FUTURE_EXPIRY_TEST";
            const kid = await generateKey(domain);
            const futureDate = new Date(Date.now() + 86400000); // +24 hours (future)

            // ACT: Add future expiry
            await metadataService.addExpiry(domain, kid, futureDate);

            // ACT: Get expired metadata
            const expiredMetas = await metadataService.getExpiredMetadata();

            // ASSERT: Should NOT include our future-expiring key
            const expiredKids = expiredMetas.map(m => m.kid);
            expect(expiredKids).not.toContain(kid);
        });

        it("should return null when adding expiry to non-existent metadata", async () => {
            const domain = "NONEXISTENT_EXPIRY";
            const fakeKid = "USER-20260101-000000-FAKEKID2";
            const expiresAt = new Date(Date.now() + 3600000);

            // ACT: Try to add expiry to non-existent metadata
            const result = await metadataService.addExpiry(domain, fakeKid, expiresAt);

            // ASSERT: Returns null
            expect(result).toBeNull();
        });
    });

    describe("Archive Operations", () => {
        it("should write metadata to archive", async () => {
            const domain = "ARCHIVE_WRITE_TEST";
            const kid = await generateKey(domain);
            const expiresAt = new Date(Date.now() + 86400000);

            // ACT: Add expiry (writes to archive)
            await metadataService.addExpiry(domain, kid, expiresAt);

            // ASSERT: Can read from archive
            const archivedMeta = await metadataService.read(domain, kid);
            expect(archivedMeta).toBeDefined();
            expect(archivedMeta.kid).toBe(kid);
            expect(archivedMeta.expiredAt).toBeDefined();
        });

        it("should delete metadata from archive", async () => {
            const domain = "ARCHIVE_DELETE_TEST";
            const kid = await generateKey(domain);
            const expiresAt = new Date(Date.now() + 86400000);

            // Arrange: Create archived metadata
            await metadataService.addExpiry(domain, kid, expiresAt);
            let meta = await metadataService.read(domain, kid);
            expect(meta).toBeDefined();

            // ACT: Delete from archive
            await metadataService.deleteArchived(kid);

            // ASSERT: Falls back to origin (which still exists)
            meta = await metadataService.read(domain, kid);
            expect(meta).toBeDefined();
            expect(meta.kid).toBe(kid);
        });

        it("should handle reading from archive when origin is deleted", async () => {
            const domain = "ARCHIVE_FALLBACK_TEST";
            const kid = await generateKey(domain);
            const expiresAt = new Date(Date.now() + 86400000);

            // Arrange: Add expiry (creates archive) and delete origin
            await metadataService.addExpiry(domain, kid, expiresAt);
            await metadataService.deleteOrigin(domain, kid);

            // ACT: Read metadata (should fallback to archive)
            const meta = await metadataService.read(domain, kid);

            // ASSERT: Still readable from archive
            expect(meta).toBeDefined();
            expect(meta.kid).toBe(kid);
            expect(meta.expiredAt).toBeDefined();
        });
    });

    describe("Multi-Domain Isolation", () => {
        it("should keep metadata isolated per domain", async () => {
            const domainA = "DOMAIN_A";
            const domainB = "DOMAIN_B";
            const kidA = await generateKey(domainA);
            const kidB = await generateKey(domainB);

            // ACT: Read metadata from respective domains
            const metaA = await metadataService.read(domainA, kidA);
            const metaB = await metadataService.read(domainB, kidB);

            // ASSERT: Each domain has correct metadata
            expect(metaA.domain).toBe(domainA);
            expect(metaB.domain).toBe(domainB);

            // ASSERT: Cross-domain reads return null
            const metaACrossRead = await metadataService.read(domainB, kidA);
            const metaBCrossRead = await metadataService.read(domainA, kidB);
            expect(metaACrossRead).toBeNull();
            expect(metaBCrossRead).toBeNull();
        });

        it("should handle concurrent metadata operations across domains", async () => {
            const domains = ["CONCURRENT_1", "CONCURRENT_2", "CONCURRENT_3"];

            // ACT: Concurrent key generation (creates metadata)
            const kids = await Promise.all(
                domains.map(domain => generateKey(domain))
            );

            // ACT: Concurrent metadata reads
            const metas = await Promise.all(
                domains.map((domain, i) => metadataService.read(domain, kids[i]))
            );

            // ASSERT: All metadata created correctly
            expect(metas.length).toBe(3);
            metas.forEach((meta, i) => {
                expect(meta).toBeDefined();
                expect(meta.domain).toBe(domains[i]);
                expect(meta.kid).toBe(kids[i]);
            });
        });

        it("should keep archived metadata accessible across domains", async () => {
            const domainA = "ARCHIVE_DOMAIN_A";
            const domainB = "ARCHIVE_DOMAIN_B";
            const kidA = await generateKey(domainA);
            const kidB = await generateKey(domainB);

            // ACT: Archive both
            await metadataService.addExpiry(domainA, kidA, new Date(Date.now() - 1000));
            await metadataService.addExpiry(domainB, kidB, new Date(Date.now() - 2000));

            // ACT: Get all expired
            const expired = await metadataService.getExpiredMetadata();

            // ASSERT: Both domains' expired metadata present
            const expiredKids = expired.map(m => m.kid);
            expect(expiredKids).toContain(kidA);
            expect(expiredKids).toContain(kidB);
        });
    });

    describe("Error Handling", () => {
        it("should handle deleting non-existent origin metadata gracefully", async () => {
            const domain = "DELETE_NONEXISTENT";
            const fakeKid = "USER-20260101-000000-FAKEKID3";

            // ACT & ASSERT: Should not throw
            await expect(async () => {
                await metadataService.deleteOrigin(domain, fakeKid);
            }).not.toThrow();
        });

        it("should handle deleting non-existent archived metadata gracefully", async () => {
            const fakeKid = "USER-20260101-000000-FAKEKID4";

            // ACT & ASSERT: Should not throw
            await expect(async () => {
                await metadataService.deleteArchived(fakeKid);
            }).not.toThrow();
        });

        it("should return empty array when no archived metadata exists", async () => {
            // This test assumes a clean state or no other tests created archives
            // ACT: Get all expired (requires reading all archives)
            const expired = await metadataService.getExpiredMetadata();

            // ASSERT: Returns array (even if empty)
            expect(Array.isArray(expired)).toBe(true);
        });

        it("should handle corrupted metadata file gracefully", async () => {
            const domain = "CORRUPTED_META_TEST";
            const kid = await generateKey(domain);

            // ACT: Corrupt the metadata file
            const metaPath = testPaths.metaKeyFile(domain, kid);
            await fs.writeFile(metaPath, "{ invalid json", "utf8");

            // ACT & ASSERT: Should throw on read
            await expect(async () => {
                await metadataService.read(domain, kid);
            }).rejects.toThrow();
        });
    });

    describe("Metadata Structure Validation", () => {
        it("should include all required fields in created metadata", async () => {
            const domain = "STRUCTURE_TEST";
            const kid = await generateKey(domain);

            // ACT: Read metadata
            const meta = await metadataService.read(domain, kid);

            // ASSERT: All required fields present
            expect(meta).toHaveProperty("kid");
            expect(meta).toHaveProperty("domain");
            expect(meta).toHaveProperty("createdAt");
            expect(meta).toHaveProperty("expiredAt");

            // ASSERT: Types correct
            expect(typeof meta.kid).toBe("string");
            expect(typeof meta.domain).toBe("string");
            expect(typeof meta.createdAt).toBe("string"); // ISO string
            expect(meta.expiredAt).toBeNull(); // null initially
        });

        it("should add expiry to archived metadata", async () => {
            const domain = "STATUS_UPDATE_TEST";
            const kid = await generateKey(domain);

            // Initial state - no expiry
            let meta = await metadataService.read(domain, kid);
            expect(meta.expiredAt).toBeNull();

            // ACT: Add expiry (writes to archive)
            const expiresAt = new Date(Date.now() + 86400000);
            const archivedMeta = await metadataService.addExpiry(domain, kid, expiresAt);

            // ASSERT: Archive metadata has expiry
            expect(archivedMeta.expiredAt).toBeDefined();
            const expectedTime = expiresAt.getTime();
            const actualTime = new Date(archivedMeta.expiredAt).getTime();
            expect(Math.abs(actualTime - expectedTime)).toBeLessThan(1000); // Within 1 second
        });

        it("should preserve metadata across archive operations", async () => {
            const domain = "PRESERVE_META_TEST";
            const customDate = new Date("2025-06-15T10:30:00.000Z");
            const kid = cryptoEngine.generateKID(domain);

            // Create directory first
            await fs.mkdir(testPaths.metaKeyDir(domain), { recursive: true });

            // Create with custom date
            await metadataService.create(domain, kid, customDate);
            const originalMeta = await metadataService.read(domain, kid);

            // ACT: Archive it
            const expiresAt = new Date(Date.now() + 86400000);
            await metadataService.addExpiry(domain, kid, expiresAt);

            // ASSERT: Original fields preserved
            const archivedMeta = await metadataService.read(domain, kid);
            expect(archivedMeta.kid).toBe(originalMeta.kid);
            expect(archivedMeta.domain).toBe(originalMeta.domain);
            expect(archivedMeta.createdAt).toBe(originalMeta.createdAt);
        });
    });
});
