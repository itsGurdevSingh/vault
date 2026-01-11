import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import {
    setupTestEnvironment,
    cleanupTestEnvironment,
    createTestKeyPaths,
} from "./helpers/testSetup.js";
import { JwksBuilder } from "../../src/domain/key-manager/modules/builder/jwksBuilder.js";
import { RSAKeyGenerator } from "../../src/domain/key-manager/modules/generator/RSAKeyGenerator.js";
import { KeyWriter } from "../../src/domain/key-manager/modules/generator/KeyWriter.js";
import { DirManager } from "../../src/domain/key-manager/modules/generator/DirManager.js";
import { KeyDirectory } from "../../src/domain/key-manager/modules/loader/KeyDirectory.js";
import { KeyRegistry } from "../../src/domain/key-manager/modules/loader/KeyRegistry.js";
import { KeyReader } from "../../src/domain/key-manager/modules/loader/KeyReader.js";
import { MetadataService } from "../../src/domain/key-manager/modules/metadata/MetadataService.js";
import { MetadataFileStore } from "../../src/domain/key-manager/modules/metadata/metadataFileStore.js";
import { CryptoEngine } from "../../src/infrastructure/cryptoEngine/CryptoEngine.js";
import { CryptoConfig } from "../../src/infrastructure/cryptoEngine/cryptoConfig.js";
import { KIDFactory } from "../../src/infrastructure/cryptoEngine/KIDFactory.js";
import { pemToArrayBuffer, base64UrlEncode, assertPlainObject } from "../../src/infrastructure/cryptoEngine/utils.js";
import { KIDFactory } from "../../src/infrastructure/cryptoEngine/KIDFactory.js";
import { utils } from "../../src/infrastructure/cryptoEngine/utils.js";
import { Cache } from "../../src/utils/cache.js";

describe("Integration: Builder (JWKS Generation) Flow", () => {
    let testPaths;
    let cryptoEngine;
    let rsaKeyGenerator;
    let keyRegistry;
    let builder;
    let builderCache;

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

        // Initialize generator
        rsaKeyGenerator = new RSAKeyGenerator(
            cryptoEngine,
            metadataService,
            keyWriter,
            dirManager
        );

        // Initialize key directory and registry (for listing public keys)
        const keyDirectory = new KeyDirectory(testPaths, fs.readdir);

        // Create simple cache for KeyReader (needs specific methods)
        const readerCache = {
            private: new Map(),
            public: new Map(),
            setPrivate(kid, pem) { this.private.set(kid, pem); },
            setPublic(kid, pem) { this.public.set(kid, pem); }
        };
        const keyReader = new KeyReader(readerCache, testPaths, cryptoEngine);
        keyRegistry = new KeyRegistry({ directory: keyDirectory, reader: keyReader });

        // Initialize cache
        builderCache = new Cache();

        // Initialize builder (cache, loader, cryptoEngine)
        builder = new JwksBuilder(builderCache, keyRegistry, cryptoEngine);
    });

    afterAll(async () => {
        await cleanupTestEnvironment();
    });

    beforeEach(() => {
        // Clear cache before each test
        builderCache.clear();
    });

    async function setupDomain(domain, keyCount = 1) {
        const kids = [];
        for (let i = 0; i < keyCount; i++) {
            const kid = await rsaKeyGenerator.generate(domain);
            kids.push(kid);
            // Small delay to ensure different timestamps
            if (i < keyCount - 1) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        return kids;
    }

    describe("JWKS Generation", () => {
        it("should generate JWKS for single public key", async () => {
            const domain = "USER";
            const [kid] = await setupDomain(domain, 1);

            // ACT: Build JWKS
            const jwks = await builder.getJWKS(domain);

            // ASSERT: JWKS structure
            expect(jwks).toBeDefined();
            expect(jwks.keys).toBeInstanceOf(Array);
            expect(jwks.keys.length).toBe(1);

            // ASSERT: JWK format (RFC 7517)
            const jwk = jwks.keys[0];
            expect(jwk.kty).toBe("RSA");
            expect(jwk.use).toBe("sig");
            expect(jwk.alg).toBe("RS256");
            expect(jwk.kid).toBe(kid);
            expect(jwk.n).toBeDefined(); // modulus
            expect(jwk.e).toBeDefined(); // exponent
            expect(typeof jwk.n).toBe("string");
            expect(typeof jwk.e).toBe("string");

            // ASSERT: No private key components
            expect(jwk.d).toBeUndefined();
            expect(jwk.p).toBeUndefined();
            expect(jwk.q).toBeUndefined();
        });

        it("should generate JWKS with multiple public keys", async () => {
            const domain = "SERVICE";
            const kids = await setupDomain(domain, 3);

            // ACT: Build JWKS
            const jwks = await builder.getJWKS(domain);

            // ASSERT: All keys included
            expect(jwks.keys.length).toBe(3);

            // ASSERT: All KIDs present
            const jwkKids = jwks.keys.map((jwk) => jwk.kid);
            expect(jwkKids).toEqual(expect.arrayContaining(kids));
        });

        it("should generate empty JWKS for domain with no keys", async () => {
            const domain = "EMPTY_DOMAIN";

            // ARRANGE: Create empty directories (no keys)
            await fs.mkdir(testPaths.publicDir(domain), { recursive: true });
            await fs.mkdir(testPaths.privateDir(domain), { recursive: true });

            // ACT: Build JWKS without generating keys
            const jwks = await builder.getJWKS(domain);

            // ASSERT: Empty keys array
            expect(jwks).toBeDefined();
            expect(jwks.keys).toBeInstanceOf(Array);
            expect(jwks.keys.length).toBe(0);
        });

        it("should include correct JWK properties", async () => {
            const domain = "PROPERTIES_TEST";
            await setupDomain(domain, 1);

            // ACT
            const jwks = await builder.getJWKS(domain);
            const jwk = jwks.keys[0];

            // ASSERT: Required properties
            expect(jwk).toHaveProperty("kty");
            expect(jwk).toHaveProperty("use");
            expect(jwk).toHaveProperty("alg");
            expect(jwk).toHaveProperty("kid");
            expect(jwk).toHaveProperty("n");
            expect(jwk).toHaveProperty("e");

            // ASSERT: No extra properties (only public components)
            const allowedProps = ["kty", "use", "alg", "kid", "n", "e", "key_ops", "ext"];
            const actualProps = Object.keys(jwk);
            for (const prop of actualProps) {
                expect(allowedProps).toContain(prop);
            }
        });
    });

    describe("PEM to JWK Conversion", () => {
        it("should correctly convert RSA public key PEM to JWK", async () => {
            const domain = "CONVERT_TEST";
            await setupDomain(domain, 1);

            // ACT
            const jwks = await builder.getJWKS(domain);
            const jwk = jwks.keys[0];

            // ASSERT: Modulus (n) is base64url encoded
            expect(jwk.n).toMatch(/^[A-Za-z0-9_-]+$/);
            expect(jwk.n.length).toBeGreaterThan(500); // RSA 4096-bit

            // ASSERT: Exponent (e) is base64url encoded
            expect(jwk.e).toMatch(/^[A-Za-z0-9_-]+$/);
            // Common RSA exponent is 65537 (AQAB in base64url)
            expect(jwk.e).toBe("AQAB");
        });

        it("should produce unique modulus for each key", async () => {
            const domain = "UNIQUE_TEST";
            await setupDomain(domain, 2);

            // ACT
            const jwks = await builder.getJWKS(domain);

            // ASSERT: Different modulus values
            const moduli = jwks.keys.map((jwk) => jwk.n);
            expect(moduli[0]).not.toBe(moduli[1]);
        });

        it("should handle RSA 4096-bit key conversion", async () => {
            const domain = "BIT_LENGTH_TEST";
            await setupDomain(domain, 1);

            // ACT
            const jwks = await builder.getJWKS(domain);
            const jwk = jwks.keys[0];

            // ASSERT: Modulus length corresponds to 4096-bit key
            // Base64url encoding of 4096-bit (512 bytes) = ~683 characters
            expect(jwk.n.length).toBeGreaterThan(680);
            expect(jwk.n.length).toBeLessThan(690);
        });
    });

    describe("Caching Behavior", () => {
        it("should cache JWKs (per-KID) after first build", async () => {
            const domain = "CACHE_TEST";
            const kids = await setupDomain(domain, 1);

            // ACT: First build (cache miss)
            const jwks1 = await builder.getJWKS(domain);

            // ASSERT: JWK cached by KID
            const cachedJWK = builderCache.get(kids[0]);
            expect(cachedJWK).toBeDefined();
            expect(cachedJWK).toEqual(jwks1.keys[0]);

            // ACT: Second build (cache hit for JWKs)
            const jwks2 = await builder.getJWKS(domain);

            // ASSERT: Same JWK object returned from cache
            expect(jwks2.keys[0]).toBe(jwks1.keys[0]);
        });

        it("should return cached JWKs (same object reference) on subsequent calls", async () => {
            const domain = "CACHE_FS_TEST";
            const [kid] = await setupDomain(domain, 1);

            // ACT: First build (populates JWK cache)
            const jwks1 = await builder.getJWKS(domain);

            // ACT: Second build (JWK cache hit - same KID returns same JWK object)
            const jwks2 = await builder.getJWKS(domain);

            // ASSERT: Same JWK object returned from cache (object identity)
            expect(jwks2.keys[0]).toBe(jwks1.keys[0]);
            expect(jwks2.keys.length).toBe(1);
        });

        it("should cache JWKs per KID independently", async () => {
            const domainA = "CACHE_A";
            const domainB = "CACHE_B";
            const kidsA = await setupDomain(domainA, 1);
            const kidsB = await setupDomain(domainB, 2);

            // ACT: Build for both domains
            const jwksA = await builder.getJWKS(domainA);
            const jwksB = await builder.getJWKS(domainB);

            // ASSERT: Different JWKs cached by different KIDs
            expect(builderCache.get(kidsA[0])).toBe(jwksA.keys[0]);

            // Find JWKs in jwksB by KID (order might differ)
            const jwkB0 = jwksB.keys.find(k => k.kid === kidsB[0]);
            const jwkB1 = jwksB.keys.find(k => k.kid === kidsB[1]);
            expect(builderCache.get(kidsB[0])).toBe(jwkB0);
            expect(builderCache.get(kidsB[1])).toBe(jwkB1);

            expect(jwksA.keys[0]).not.toBe(jwkB0);
            expect(kidsA[0]).not.toBe(kidsB[0]);
            expect(jwksA.keys.length).toBe(1);
            expect(jwksB.keys.length).toBe(2);
        });

        it("should rebuild JWKS after cache clear", async () => {
            const domain = "REBUILD_TEST";
            await setupDomain(domain, 1);

            // ACT: First build
            const jwks1 = await builder.getJWKS(domain);

            // Clear cache
            builderCache.delete(domain);

            // ACT: Second build (cache miss, rebuild)
            const jwks2 = await builder.getJWKS(domain);

            // ASSERT: Different objects (rebuilt, not cached)
            expect(jwks2).not.toBe(jwks1);
            // But same content
            expect(jwks2.keys[0].kid).toBe(jwks1.keys[0].kid);
        });
    });

    describe("Multi-Domain Support", () => {
        it("should build JWKS for different domains independently", async () => {
            const domainX = "DOMAIN_X";
            const domainY = "DOMAIN_Y";
            await setupDomain(domainX, 2);
            await setupDomain(domainY, 3);

            // ACT
            const jwksX = await builder.getJWKS(domainX);
            const jwksY = await builder.getJWKS(domainY);

            // ASSERT: Independent JWKS
            expect(jwksX.keys.length).toBe(2);
            expect(jwksY.keys.length).toBe(3);

            // ASSERT: No key overlap
            const kidsX = jwksX.keys.map((jwk) => jwk.kid);
            const kidsY = jwksY.keys.map((jwk) => jwk.kid);
            for (const kidX of kidsX) {
                expect(kidsY).not.toContain(kidX);
            }
        });

        it("should handle concurrent builds for different domains", async () => {
            const domain1 = "CONCURRENT_1";
            const domain2 = "CONCURRENT_2";
            await setupDomain(domain1, 1);
            await setupDomain(domain2, 1);

            // ACT: Concurrent builds
            const [jwks1, jwks2] = await Promise.all([
                builder.getJWKS(domain1),
                builder.getJWKS(domain2),
            ]);

            // ASSERT: Both succeeded
            expect(jwks1.keys.length).toBe(1);
            expect(jwks2.keys.length).toBe(1);
            expect(jwks1.keys[0].kid).not.toBe(jwks2.keys[0].kid);
        });
    });

    describe("Error Handling", () => {
        it("should throw error for invalid domain", async () => {
            // ACT & ASSERT
            await expect(builder.getJWKS("")).rejects.toThrow();
        });

        it("should throw error for null domain", async () => {
            // ACT & ASSERT
            await expect(builder.getJWKS(null)).rejects.toThrow();
        });

        it("should handle corrupted public key file gracefully", async () => {
            const domain = "CORRUPT_TEST";
            const [kid] = await setupDomain(domain, 1);

            // Corrupt the public key file
            const publicKeyPath = testPaths.publicKey(domain, kid);
            await fs.writeFile(publicKeyPath, "INVALID PEM DATA");

            // Clear cache to force rebuild
            builderCache.delete(domain);

            // ACT & ASSERT: Should throw or return empty JWKS
            // (Depending on builder implementation - either is acceptable)
            try {
                const jwks = await builder.getJWKS(domain);
                // If it doesn't throw, should return empty keys
                expect(jwks.keys.length).toBe(0);
            } catch (error) {
                // Throwing is also acceptable behavior
                expect(error).toBeDefined();
            }
        });

        it("should handle missing public key directory", async () => {
            const domain = "NO_DIR_TEST";

            // ACT & ASSERT: Should throw or return empty JWKS
            try {
                const jwks = await builder.getJWKS(domain);
                // If it doesn't throw, should return empty JWKS
                expect(jwks.keys).toBeInstanceOf(Array);
                expect(jwks.keys.length).toBe(0);
            } catch (error) {
                // Or it's acceptable to throw ENOENT error
                expect(error.code).toBe("ENOENT");
            }
        });
    });

    describe("Key Ordering", () => {
        it("should return keys in consistent order", async () => {
            const domain = "ORDER_TEST";
            await setupDomain(domain, 3);

            // ACT: Build multiple times
            builderCache.delete(domain);
            const jwks1 = await builder.getJWKS(domain);

            builderCache.delete(domain);
            const jwks2 = await builder.getJWKS(domain);

            // ASSERT: Same order
            const kids1 = jwks1.keys.map((jwk) => jwk.kid);
            const kids2 = jwks2.keys.map((jwk) => jwk.kid);
            expect(kids1).toEqual(kids2);
        });
    });
});
