/**
 * Integration Test: JWT Signing & Verification Flow
 * 
 * Tests the complete JWT signing and verification flow with real crypto operations.
 * Uses REAL key generation, REAL signing, REAL verification - no mocks.
 * 
 * Flow tested:
 * 1. Generate key pair → Store to filesystem
 * 2. Set active KID for domain
 * 3. Sign JWT with payload
 * 4. Verify JWT signature
 * 5. Generate JWKS endpoint response
 * 6. Verify JWT using JWKS public key
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdir, writeFile, readFile } from 'fs/promises';
import crypto from 'crypto';
import { setupTestEnvironment, cleanupTestEnvironment, createTestKeyPaths } from './helpers/testSetup.js';
import { RSAKeyGenerator } from '../../src/domain/key-manager/modules/generator/RSAKeyGenerator.js';
import { KeyWriter } from '../../src/domain/key-manager/modules/generator/KeyWriter.js';
import { DirManager } from '../../src/domain/key-manager/modules/generator/DirManager.js';
import { KeyReader } from '../../src/domain/key-manager/modules/loader/KeyReader.js';
import { MetadataService } from '../../src/domain/key-manager/modules/metadata/MetadataService.js';
import { MetadataFileStore } from '../../src/domain/key-manager/modules/metadata/metadataFileStore.js';
import { Signer } from '../../src/domain/key-manager/modules/signer/Signer.js';
import { JwksBuilder } from '../../src/domain/key-manager/modules/builder/jwksBuilder.js';
import { KeyResolver } from '../../src/domain/key-manager/utils/keyResolver.js';
import { activeKidStore } from '../../src/state/ActiveKIDState.js';
import { CryptoEngine } from '../../src/infrastructure/cryptoEngine/CryptoEngine.js';
import { CryptoConfig } from '../../src/infrastructure/cryptoEngine/cryptoConfig.js';
import { KIDFactory } from '../../src/infrastructure/cryptoEngine/KIDFactory.js';
import { TokenBuilder } from '../../src/infrastructure/cryptoEngine/tokenBuilder.js';
import * as utils from '../../src/infrastructure/cryptoEngine/utils.js';

describe('Integration: JWT Signing & Verification Flow', () => {
    let testPaths;
    let cryptoEngine;
    let rsaKeyGenerator;
    let signer;
    let jwksBuilder;
    let keyReader;
    let keyResolver;
    let loaderMock;

    beforeAll(async () => {
        // Setup test environment
        await setupTestEnvironment();
        testPaths = createTestKeyPaths();

        // Initialize CryptoEngine
        const kidFactory = new KIDFactory({ randomBytes: crypto.randomBytes.bind(crypto) });
        const tokenBuilder = new TokenBuilder(utils);
        cryptoEngine = new CryptoEngine({
            cryptoModule: crypto,
            config: CryptoConfig,
            utils: utils,
            tokenBuilder: tokenBuilder,
            kidFactory: kidFactory
        });

        // Initialize key generation components
        const keyWriter = new KeyWriter(testPaths, writeFile);
        const dirManager = new DirManager(testPaths, mkdir);
        const metadataFileStore = new MetadataFileStore(testPaths, {
            writeFile,
            readFile,
            unlink: async () => { },
            readdir: async () => [],
            mkdir,
            path: { join: (await import('path')).join }
        });
        const metadataService = new MetadataService(metadataFileStore);

        rsaKeyGenerator = new RSAKeyGenerator(
            cryptoEngine,
            metadataService,
            keyWriter,
            dirManager
        );

        // Initialize KeyReader
        const simpleCache = {
            private: new Map(),
            public: new Map(),
            get(kid) { return this.private.get(kid); },
            setPrivate(kid, pem) { this.private.set(kid, pem); },
            setPublic(kid, pem) { this.public.set(kid, pem); }
        };
        keyReader = new KeyReader(simpleCache, testPaths, cryptoEngine);

        // Initialize loader mock (provides keys by KID)
        loaderMock = {
            async getPrivateKey(kid) {
                const pem = await keyReader.privateKey(kid);
                return pem; // Return just the PEM string (KeyResolver will wrap it)
            },
            async getPublicKeyMap(domain) {
                // Return all public keys for domain (simplified - returns active key only)
                const activeKid = await activeKidStore.getActiveKid(domain);
                if (!activeKid) return {};

                const publicPem = await readFile(testPaths.publicKey(domain, activeKid), 'utf8');
                return { [activeKid]: publicPem };
            }
        };

        // Initialize KeyResolver
        keyResolver = new KeyResolver({
            loader: loaderMock,
            kidStore: activeKidStore
        });

        // Initialize Signer
        const signerCache = new Map();
        signer = new Signer(signerCache, keyResolver, cryptoEngine, {
            defaultTTL: 3600, // 1 hour for tests
            maxPayloadBytes: 4096
        });

        // Initialize JWKS Builder
        const jwksCache = new Map();
        jwksBuilder = new JwksBuilder(jwksCache, loaderMock, cryptoEngine);
    });

    afterAll(async () => {
        await cleanupTestEnvironment();
    });

    beforeEach(() => {
        // Clear active KID state between tests
        activeKidStore.clearAll();
    });

    describe('Basic Signing Flow', () => {
        it('should generate key, sign JWT, and verify signature', async () => {
            const domain = 'USER';
            const payload = { userId: '12345', role: 'admin' };

            // 1. Generate key
            const kid = await rsaKeyGenerator.generate(domain);
            await activeKidStore.setActiveKid(domain, kid);

            // 2. Sign JWT
            const jwt = await signer.sign(domain, payload);

            // 3. Verify JWT structure
            expect(jwt).toBeTruthy();
            expect(jwt.split('.')).toHaveLength(3);

            const [headerB64, payloadB64, signatureB64] = jwt.split('.');

            // 4. Decode and verify header
            const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
            expect(header.alg).toBe('RS256');
            expect(header.typ).toBe('JWT');
            expect(header.kid).toBe(kid);

            // 5. Decode and verify payload
            const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
            expect(decodedPayload.userId).toBe('12345');
            expect(decodedPayload.role).toBe('admin');
            expect(decodedPayload).toHaveProperty('iat');
            expect(decodedPayload).toHaveProperty('exp');
            expect(decodedPayload.exp - decodedPayload.iat).toBe(3600); // 1 hour TTL

            // 6. Verify signature is base64url encoded
            expect(signatureB64).toMatch(/^[A-Za-z0-9_-]+$/);
        });

        it('should sign JWT with custom TTL', async () => {
            const domain = 'SERVICE';
            const payload = { serviceId: 'api-gateway' };

            const kid = await rsaKeyGenerator.generate(domain);
            await activeKidStore.setActiveKid(domain, kid);

            const jwt = await signer.sign(domain, payload, { ttlSeconds: 7200 }); // 2 hours

            const [, payloadB64] = jwt.split('.');
            const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

            expect(decodedPayload.exp - decodedPayload.iat).toBe(7200); // 2 hours
        });

        it('should sign JWT with additional claims', async () => {
            const domain = 'TEST';
            const payload = { testId: 'test-123' };

            const kid = await rsaKeyGenerator.generate(domain);
            await activeKidStore.setActiveKid(domain, kid);

            const jwt = await signer.sign(domain, payload, {
                additionalClaims: {
                    iss: 'my-auth-service',
                    aud: 'my-api'
                }
            });

            const [, payloadB64] = jwt.split('.');
            const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

            expect(decodedPayload.iss).toBe('my-auth-service');
            expect(decodedPayload.aud).toBe('my-api');
            expect(decodedPayload.testId).toBe('test-123');
        });
    });

    describe('Signature Verification', () => {
        it('should verify JWT signature with public key', async () => {
            const domain = 'USER';
            const payload = { userId: 'verify-test' };

            const kid = await rsaKeyGenerator.generate(domain);
            await activeKidStore.setActiveKid(domain, kid);

            const jwt = await signer.sign(domain, payload);
            const [headerB64, payloadB64, signatureB64] = jwt.split('.');

            // Load public key
            const publicPem = await readFile(testPaths.publicKey(domain, kid), 'utf8');
            const publicKey = crypto.createPublicKey(publicPem);

            // Verify signature
            const signingInput = `${headerB64}.${payloadB64}`;
            const signature = Buffer.from(signatureB64, 'base64url');

            const isValid = crypto.verify(
                'RSA-SHA256',
                Buffer.from(signingInput),
                publicKey,
                signature
            );

            expect(isValid).toBe(true);
        });

        it('should fail verification with wrong public key', async () => {
            const domain1 = 'USER';
            const domain2 = 'SERVICE';
            const payload = { userId: 'wrong-key-test' };

            // Generate two different keys
            const kid1 = await rsaKeyGenerator.generate(domain1);
            const kid2 = await rsaKeyGenerator.generate(domain2);
            await activeKidStore.setActiveKid(domain1, kid1);

            // Sign with domain1's key
            const jwt = await signer.sign(domain1, payload);
            const [headerB64, payloadB64, signatureB64] = jwt.split('.');

            // Try to verify with domain2's public key (wrong key)
            const wrongPublicPem = await readFile(testPaths.publicKey(domain2, kid2), 'utf8');
            const wrongPublicKey = crypto.createPublicKey(wrongPublicPem);

            const signingInput = `${headerB64}.${payloadB64}`;
            const signature = Buffer.from(signatureB64, 'base64url');

            const isValid = crypto.verify(
                'RSA-SHA256',
                Buffer.from(signingInput),
                wrongPublicKey,
                signature
            );

            expect(isValid).toBe(false);
        });

        it('should fail verification with tampered payload', async () => {
            const domain = 'USER';
            const payload = { userId: 'tamper-test' };

            const kid = await rsaKeyGenerator.generate(domain);
            await activeKidStore.setActiveKid(domain, kid);

            const jwt = await signer.sign(domain, payload);
            const [headerB64, payloadB64, signatureB64] = jwt.split('.');

            // Tamper with payload
            const tamperedPayload = { userId: 'hacker', role: 'super-admin' };
            const tamperedPayloadB64 = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');

            // Load correct public key
            const publicPem = await readFile(testPaths.publicKey(domain, kid), 'utf8');
            const publicKey = crypto.createPublicKey(publicPem);

            // Try to verify with tampered payload
            const signingInput = `${headerB64}.${tamperedPayloadB64}`;
            const signature = Buffer.from(signatureB64, 'base64url');

            const isValid = crypto.verify(
                'RSA-SHA256',
                Buffer.from(signingInput),
                publicKey,
                signature
            );

            expect(isValid).toBe(false);
        });
    });

    describe('JWKS Endpoint Integration', () => {
        it('should generate JWKS response with correct format', async () => {
            const domain = 'USER';

            const kid = await rsaKeyGenerator.generate(domain);
            await activeKidStore.setActiveKid(domain, kid);

            // Generate JWKS
            const jwks = await jwksBuilder.getJWKS(domain);

            // Verify JWKS structure
            expect(jwks).toHaveProperty('keys');
            expect(Array.isArray(jwks.keys)).toBe(true);
            expect(jwks.keys.length).toBe(1);

            // Verify JWK format
            const jwk = jwks.keys[0];
            expect(jwk.kty).toBe('RSA');
            expect(jwk.kid).toBe(kid);
            expect(jwk.use).toBe('sig');
            expect(jwk.alg).toBe('RS256');
            expect(jwk).toHaveProperty('n'); // RSA modulus
            expect(jwk).toHaveProperty('e'); // RSA exponent
        });

        it('should verify JWT using JWKS public key', async () => {
            const domain = 'SERVICE';
            const payload = { serviceId: 'jwks-test' };

            const kid = await rsaKeyGenerator.generate(domain);
            await activeKidStore.setActiveKid(domain, kid);

            // Sign JWT
            const jwt = await signer.sign(domain, payload);
            const [headerB64, payloadB64, signatureB64] = jwt.split('.');

            // Get JWKS
            const jwks = await jwksBuilder.getJWKS(domain);
            const jwk = jwks.keys[0];

            // Import JWK as public key
            const publicKey = crypto.createPublicKey({
                key: jwk,
                format: 'jwk'
            });

            // Verify signature
            const signingInput = `${headerB64}.${payloadB64}`;
            const signature = Buffer.from(signatureB64, 'base64url');

            const isValid = crypto.verify(
                'RSA-SHA256',
                Buffer.from(signingInput),
                publicKey,
                signature
            );

            expect(isValid).toBe(true);
        });

        it('should cache JWK conversion', async () => {
            const domain = 'TEST';

            const kid = await rsaKeyGenerator.generate(domain);
            await activeKidStore.setActiveKid(domain, kid);

            // First call
            const jwks1 = await jwksBuilder.getJWKS(domain);

            // Second call (should use cache)
            const jwks2 = await jwksBuilder.getJWKS(domain);

            // Both should return identical JWKs
            expect(jwks1.keys[0]).toEqual(jwks2.keys[0]);
        });
    });

    describe('Multi-Domain Signing', () => {
        it('should sign JWTs for different domains with different keys', async () => {
            const userPayload = { userId: 'user123' };
            const servicePayload = { serviceId: 'service456' };

            // Generate keys for both domains
            const userKid = await rsaKeyGenerator.generate('USER');
            const serviceKid = await rsaKeyGenerator.generate('SERVICE');

            await activeKidStore.setActiveKid('USER', userKid);
            await activeKidStore.setActiveKid('SERVICE', serviceKid);

            // Sign JWTs
            const userJwt = await signer.sign('USER', userPayload);
            const serviceJwt = await signer.sign('SERVICE', servicePayload);

            // Decode headers
            const [userHeaderB64] = userJwt.split('.');
            const [serviceHeaderB64] = serviceJwt.split('.');

            const userHeader = JSON.parse(Buffer.from(userHeaderB64, 'base64url').toString());
            const serviceHeader = JSON.parse(Buffer.from(serviceHeaderB64, 'base64url').toString());

            // Verify different KIDs used
            expect(userHeader.kid).toBe(userKid);
            expect(serviceHeader.kid).toBe(serviceKid);
            expect(userKid).not.toBe(serviceKid);
        });

        it('should verify each domain JWT with correct JWKS', async () => {
            const userKid = await rsaKeyGenerator.generate('USER');
            const serviceKid = await rsaKeyGenerator.generate('SERVICE');

            await activeKidStore.setActiveKid('USER', userKid);
            await activeKidStore.setActiveKid('SERVICE', serviceKid);

            const userJwt = await signer.sign('USER', { userId: 'test' });
            const serviceJwt = await signer.sign('SERVICE', { serviceId: 'test' });

            // Get JWKS for each domain
            const userJwks = await jwksBuilder.getJWKS('USER');
            const serviceJwks = await jwksBuilder.getJWKS('SERVICE');

            // Extract user JWT components
            const [userHeaderB64, userPayloadB64, userSigB64] = userJwt.split('.');
            const userPublicKey = crypto.createPublicKey({
                key: userJwks.keys[0],
                format: 'jwk'
            });

            // Verify user JWT with user JWKS
            const userValid = crypto.verify(
                'RSA-SHA256',
                Buffer.from(`${userHeaderB64}.${userPayloadB64}`),
                userPublicKey,
                Buffer.from(userSigB64, 'base64url')
            );
            expect(userValid).toBe(true);

            // Extract service JWT components
            const [serviceHeaderB64, servicePayloadB64, serviceSigB64] = serviceJwt.split('.');
            const servicePublicKey = crypto.createPublicKey({
                key: serviceJwks.keys[0],
                format: 'jwk'
            });

            // Verify service JWT with service JWKS
            const serviceValid = crypto.verify(
                'RSA-SHA256',
                Buffer.from(`${serviceHeaderB64}.${servicePayloadB64}`),
                servicePublicKey,
                Buffer.from(serviceSigB64, 'base64url')
            );
            expect(serviceValid).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should throw error when no active KID set', async () => {
            const domain = 'USER';
            const payload = { userId: 'test' };

            // Don't set active KID
            await expect(async () => {
                await signer.sign(domain, payload);
            }).rejects.toThrow('No active signing KID');
        });

        it('should throw error for invalid domain', async () => {
            const payload = { test: 'data' };

            await expect(async () => {
                await signer.sign('', payload);
            }).rejects.toThrow('domain required');
        });

        it('should throw error for invalid payload', async () => {
            const domain = 'USER';

            const kid = await rsaKeyGenerator.generate(domain);
            await activeKidStore.setActiveKid(domain, kid);

            await expect(async () => {
                await signer.sign(domain, 'not an object');
            }).rejects.toThrow('payload must be plain object');

            await expect(async () => {
                await signer.sign(domain, ['array']);
            }).rejects.toThrow('payload must be plain object');
        });

        it('should throw error for invalid TTL', async () => {
            const domain = 'USER';
            const payload = { test: 'data' };

            const kid = await rsaKeyGenerator.generate(domain);
            await activeKidStore.setActiveKid(domain, kid);

            await expect(async () => {
                await signer.sign(domain, payload, { ttlSeconds: -1 });
            }).rejects.toThrow('ttlSeconds must be a positive number');

            await expect(async () => {
                await signer.sign(domain, payload, { ttlSeconds: 0 });
            }).rejects.toThrow('ttlSeconds must be a positive number');
        });
    });
});
