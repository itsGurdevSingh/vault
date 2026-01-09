import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import {
    setupTestEnvironment,
    cleanupTestEnvironment,
    createTestKeyPaths,
} from "./helpers/testSetup.js";
import { Rotator } from "../../src/domain/key-manager/modules/keyRotator/rotator.js";
import { KeyPairGenerator } from "../../src/domain/key-manager/modules/generator/RSAKeyGenerator.js";
import { KeyWriter } from "../../src/domain/key-manager/modules/generator/KeyWriter.js";
import { DirManager } from "../../src/domain/key-manager/modules/generator/DirManager.js";
import { Janitor } from "../../src/domain/key-manager/modules/Janitor/janitor.js";
import { KeyFileJanitor } from "../../src/domain/key-manager/modules/Janitor/KeyFileJanitor.js";
import { KeyDeleter } from "../../src/domain/key-manager/modules/Janitor/KeyDeleter.js";
import { MetadataJanitor } from "../../src/domain/key-manager/modules/Janitor/MetadataJanitor.js";
import { KeyResolver } from "../../src/domain/key-manager/utils/keyResolver.js";
import { MetadataService } from "../../src/domain/key-manager/modules/metadata/MetadataService.js";
import { MetaFileStore } from "../../src/domain/key-manager/modules/metadata/metaFileStore.js";
import { CryptoEngine } from "../../src/infrastructure/cryptoEngine/CryptoEngine.js";
import { CryptoConfig } from "../../src/infrastructure/cryptoEngine/cryptoConfig.js";
import { KIDFactory } from "../../src/infrastructure/cryptoEngine/KIDFactory.js";
import { utils } from "../../src/infrastructure/cryptoEngine/utils.js";
import { activeKidStore } from "../../src/state/ActiveKIDState.js";
import { Cache } from "../../src/utils/cache.js";

// Mock lock repo
class MockLockRepo {
    constructor() {
        this.locks = new Map();
    }
    async acquire(domain, ttlSeconds) {
        if (this.locks.has(domain)) return null;
        const token = crypto.randomUUID();
        this.locks.set(domain, token);
        setTimeout(() => this.locks.delete(domain), ttlSeconds * 1000);
        return token;
    }
    async release(domain, token) {
        if (this.locks.get(domain) === token) {
            this.locks.delete(domain);
            return 1;
        }
        return 0;
    }
}

// Mock session
class MockSession {
    startTransaction() { }
    async commitTransaction() { }
    async abortTransaction() { }
    endSession() { }
}

describe("Integration: Key Rotation Flow", () => {
    let testPaths;
    let cryptoEngine;
    let keyPairGenerator;
    let janitor;
    let keyResolver;
    let rotator;
    let mockLockRepo;
    let kidStore;
    let metadataService;

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

        // Initialize janitor (full chain: Janitor → KeyFileJanitor → KeyDeleter)
        const keyDeleter = new KeyDeleter(testPaths);
        const keyFileJanitor = new KeyFileJanitor(
            { private: new Cache(), public: new Cache() },
            new Cache(),
            new Cache(),
            keyDeleter
        );
        const metadataJanitor = new MetadataJanitor(metadataService);
        janitor = new Janitor(keyFileJanitor, metadataJanitor, null);

        // Initialize KID store and resolver
        kidStore = activeKidStore;
        const mockLoader = {
            async load(domain) {
                const kid = await kidStore.getActiveKid(domain);
                if (!kid) throw new Error(`No active KID for domain: ${domain}`);
                const privatePem = await fs.readFile(
                    testPaths.privateKey(domain, kid),
                    "utf-8"
                );
                const publicPem = await fs.readFile(
                    testPaths.publicKey(domain, kid),
                    "utf-8"
                );
                return { kid, privatePem, publicPem };
            },
        };
        keyResolver = new KeyResolver({ loader: mockLoader, kidStore });

        // Initialize mock lock repo
        mockLockRepo = new MockLockRepo();

        // Initialize rotator with proper Janitor
        rotator = new Rotator({
            keyGenerator: keyPairGenerator,
            keyJanitor: janitor,
            keyResolver,
            metadataManager: metadataService,
            LockRepo: mockLockRepo,
        });
    });

    afterAll(async () => {
        await cleanupTestEnvironment();
    });

    // Helper to generate initial key and set as active
    async function setupDomain(domain) {
        const kid = await keyPairGenerator.generate(domain);
        await kidStore.setActiveKid(domain, kid);
        return kid;
    }

    describe("Complete Rotation Cycle", () => {
        it("should rotate keys through full lifecycle (prepare → commit → cleanup)", async () => {
            const domain = "USER";

            // Setup
            const initialKid = await setupDomain(domain);

            // Wait for timestamp difference
            await new Promise((resolve) => setTimeout(resolve, 100));

            // ACT: Perform rotation
            const session = new MockSession();
            const newKid = await rotator.rotateKeys(
                domain,
                async (txSession) => {
                    // DB update placeholder
                },
                session
            );

            // ASSERT: New KID generated
            expect(newKid).toBeDefined();
            expect(newKid).not.toBe(initialKid);

            // Verify new KID is active
            const currentActiveKid = await kidStore.getActiveKid(domain);
            expect(currentActiveKid).toBe(newKid);

            // Verify old private key deleted
            const oldPrivateKeyPath = testPaths.privateKey(domain, initialKid);
            await expect(fs.access(oldPrivateKeyPath)).rejects.toThrow();

            // Verify new private key exists
            const newPrivateKeyPath = testPaths.privateKey(domain, newKid);
            await expect(fs.access(newPrivateKeyPath)).resolves.toBeUndefined();

            // Verify old public key still exists
            const oldPublicKeyPath = testPaths.publicKey(domain, initialKid);
            await expect(fs.access(oldPublicKeyPath)).resolves.toBeUndefined();

            // Verify archived metadata exists
            const archivedMeta = await metadataService.read(domain, initialKid);
            expect(archivedMeta.expiredAt).toBeDefined();
            expect(new Date(archivedMeta.expiredAt).getTime()).toBeGreaterThan(Date.now());
        });

        it("should generate different KIDs for each rotation", async () => {
            const domain = "SERVICE";

            // Generate initial key
            const kid1 = await setupDomain(domain);

            await new Promise((resolve) => setTimeout(resolve, 100));

            // First rotation
            let session = new MockSession();
            const kid2 = await rotator.rotateKeys(
                domain,
                async (txSession) => { },
                session
            );

            await new Promise((resolve) => setTimeout(resolve, 100));

            // Second rotation
            session = new MockSession();
            const kid3 = await rotator.rotateKeys(
                domain,
                async (txSession) => { },
                session
            );

            // All KIDs unique
            expect(kid1).not.toBe(kid2);
            expect(kid2).not.toBe(kid3);
            expect(kid1).not.toBe(kid3);

            // Latest is active
            const activeKid = await kidStore.getActiveKid(domain);
            expect(activeKid).toBe(kid3);
        });
    });

    describe("Rollback Mechanism", () => {
        it("should rollback rotation on DB transaction failure", async () => {
            const domain = "ROLLBACK_TEST";

            // Setup
            const initialKid = await setupDomain(domain);

            await new Promise((resolve) => setTimeout(resolve, 100));

            // ACT: Attempt rotation with failing callback
            const session = new MockSession();
            const result = await rotator.rotateKeys(
                domain,
                async (txSession) => {
                    throw new Error("Simulated DB transaction failure");
                },
                session
            );

            // ASSERT: Rotation failed
            expect(result).toBeNull();

            // Verify active KID unchanged
            const activeKid = await kidStore.getActiveKid(domain);
            expect(activeKid).toBe(initialKid);

            // Verify initial private key still exists
            const initialPrivateKeyPath = testPaths.privateKey(domain, initialKid);
            await expect(fs.access(initialPrivateKeyPath)).resolves.toBeUndefined();

            // Verify no new keys created
            const keysDir = testPaths.privateDir(domain);
            const files = await fs.readdir(keysDir);
            expect(files.length).toBe(1);
        });

        it("should clean up upcoming key files on rollback", async () => {
            const domain = "CLEANUP_TEST";

            // Setup
            const initialKid = await setupDomain(domain);

            await new Promise((resolve) => setTimeout(resolve, 100));

            // Attempt failing rotation
            const session = new MockSession();
            await rotator.rotateKeys(
                domain,
                async (txSession) => {
                    throw new Error("Forced failure for cleanup test");
                },
                session
            );

            // ASSERT: Only initial key files exist
            const privateDir = testPaths.privateDir(domain);
            const publicDir = testPaths.publicDir(domain);

            const privateKeys = await fs.readdir(privateDir);
            const publicKeys = await fs.readdir(publicDir);

            expect(privateKeys.length).toBe(1);
            expect(publicKeys.length).toBe(1);
            expect(privateKeys[0]).toBe(`${initialKid}.pem`);
            expect(publicKeys[0]).toBe(`${initialKid}.pem`);
        });
    });

    describe("Distributed Locking", () => {
        it("should prevent concurrent rotation for same domain", async () => {
            const domain = "LOCK_TEST";

            // Setup
            const initialKid = await setupDomain(domain);

            await new Promise((resolve) => setTimeout(resolve, 100));

            // Manually acquire lock
            const manualToken = await mockLockRepo.acquire(domain, 60);
            expect(manualToken).not.toBeNull();

            // ACT: Attempt rotation while lock held
            const session = new MockSession();
            const result = await rotator.rotateKeys(
                domain,
                async (txSession) => { },
                session
            );

            // ASSERT: Rotation blocked
            expect(result).toBeNull();

            // Verify active KID unchanged
            const activeKid = await kidStore.getActiveKid(domain);
            expect(activeKid).toBe(initialKid);

            // Clean up
            await mockLockRepo.release(domain, manualToken);
        });

        it("should release lock after successful rotation", async () => {
            const domain = "LOCK_RELEASE_TEST";

            // Setup
            await setupDomain(domain);

            await new Promise((resolve) => setTimeout(resolve, 100));

            // Perform rotation
            const session = new MockSession();
            await rotator.rotateKeys(
                domain,
                async (txSession) => { },
                session
            );

            // ASSERT: Lock released
            const token = await mockLockRepo.acquire(domain, 60);
            expect(token).not.toBeNull();

            // Clean up
            await mockLockRepo.release(domain, token);
        });

        it("should release lock after failed rotation", async () => {
            const domain = "LOCK_RELEASE_FAIL_TEST";

            // Setup
            await setupDomain(domain);

            await new Promise((resolve) => setTimeout(resolve, 100));

            // Attempt failing rotation
            const session = new MockSession();
            await rotator.rotateKeys(
                domain,
                async (txSession) => {
                    throw new Error("Forced failure");
                },
                session
            );

            // ASSERT: Lock released
            const token = await mockLockRepo.acquire(domain, 60);
            expect(token).not.toBeNull();

            // Clean up
            await mockLockRepo.release(domain, token);
        });
    });

    describe("Multi-Domain Isolation", () => {
        it("should rotate keys independently per domain", async () => {
            const domainA = "DOMAIN_A";
            const domainB = "DOMAIN_B";

            // Setup both domains
            const kidA1 = await setupDomain(domainA);
            const kidB1 = await setupDomain(domainB);

            await new Promise((resolve) => setTimeout(resolve, 100));

            // Rotate domain A only
            const session = new MockSession();
            const kidA2 = await rotator.rotateKeys(
                domainA,
                async (txSession) => { },
                session
            );

            // ASSERT: Domain A rotated, domain B unchanged
            expect(kidA2).not.toBe(kidA1);

            const activeKidA = await kidStore.getActiveKid(domainA);
            const activeKidB = await kidStore.getActiveKid(domainB);

            expect(activeKidA).toBe(kidA2);
            expect(activeKidB).toBe(kidB1);
        });

        it("should allow concurrent rotation of different domains", async () => {
            const domainX = "DOMAIN_X";
            const domainY = "DOMAIN_Y";

            // Setup
            await setupDomain(domainX);
            await setupDomain(domainY);

            await new Promise((resolve) => setTimeout(resolve, 100));

            // ACT: Rotate both in parallel
            const sessionX = new MockSession();
            const sessionY = new MockSession();

            const [kidX, kidY] = await Promise.all([
                rotator.rotateKeys(
                    domainX,
                    async (txSession) => { },
                    sessionX
                ),
                rotator.rotateKeys(
                    domainY,
                    async (txSession) => { },
                    sessionY
                ),
            ]);

            // ASSERT: Both succeeded
            expect(kidX).not.toBeNull();
            expect(kidY).not.toBeNull();
            expect(kidX).not.toBe(kidY);
        });
    });

    describe("Error Handling", () => {
        it("should handle rotation without active KID", async () => {
            const domain = "NO_ACTIVE_KID";

            // ACT: Attempt rotation without initial key
            const session = new MockSession();
            const result = await rotator.rotateKeys(
                domain,
                async (txSession) => { },
                session
            );

            // ASSERT: Should return null (error is caught and logged)
            expect(result).toBeNull();
        });

        it("should handle invalid domain gracefully", async () => {
            const domain = "";

            const session = new MockSession();
            await expect(
                rotator.rotateKeys(
                    domain,
                    async (txSession) => { },
                    session
                )
            ).rejects.toThrow("Invalid parameters");
        });
    });
});
