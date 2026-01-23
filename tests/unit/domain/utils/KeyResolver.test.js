import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyResolver } from '../../../../src/domain/key-manager/utils/keyResolver.js';

describe('KeyResolver', () => {
    describe('constructor', () => {
        it('should create instance with loader and ActiveKidCache', () => {
            const mockLoader = { getPrivateKey: vi.fn(), loadPrivateKey: vi.fn() };
            const mockActiveKidCache = { get: vi.fn(), set: vi.fn() };

            const resolver = new KeyResolver({ loader: mockLoader, ActiveKidCache: mockActiveKidCache });

            expect(resolver).toBeInstanceOf(KeyResolver);
            expect(resolver.loader).toBe(mockLoader);
            expect(resolver.ActiveKidCache).toBe(mockActiveKidCache);
        });

        it('should accept missing loader (no validation in constructor)', () => {
            const mockActiveKidCache = { get: vi.fn() };

            const resolver = new KeyResolver({ ActiveKidCache: mockActiveKidCache });

            expect(resolver.loader).toBeUndefined();
            expect(resolver.ActiveKidCache).toBe(mockActiveKidCache);
        });

        it('should accept missing ActiveKidCache (no validation in constructor)', () => {
            const mockLoader = { getPrivateKey: vi.fn() };

            const resolver = new KeyResolver({ loader: mockLoader });

            expect(resolver.loader).toBe(mockLoader);
            expect(resolver.ActiveKidCache).toBeUndefined();
        });
    });

    describe('getActiveKid', () => {
        let resolver;
        let mockLoader;
        let mockActiveKidCache;

        beforeEach(() => {
            mockLoader = { getPrivateKey: vi.fn(), loadPrivateKey: vi.fn() };
            mockActiveKidCache = { get: vi.fn(), set: vi.fn() };
            resolver = new KeyResolver({ loader: mockLoader, ActiveKidCache: mockActiveKidCache });
        });

        it('should call ActiveKidCache.get and return result', async () => {
            const expectedKid = 'kid-123';
            mockActiveKidCache.get.mockResolvedValue(expectedKid);

            const result = await resolver.getActiveKid('EXAMPLE');

            expect(mockActiveKidCache.get).toHaveBeenCalledTimes(1);
            expect(result).toBe(expectedKid);
        });

        it('should pass domain parameter to ActiveKidCache', async () => {
            mockActiveKidCache.get.mockResolvedValue('kid-456');

            await resolver.getActiveKid('ANY_DOMAIN');

            expect(mockActiveKidCache.get).toHaveBeenCalledWith('ANY_DOMAIN');
        });

        it('should propagate errors from ActiveKidCache', async () => {
            const error = new Error('KID cache unavailable');
            mockActiveKidCache.get.mockRejectedValue(error);

            await expect(resolver.getActiveKid('EXAMPLE'))
                .rejects.toThrow('KID cache unavailable');
        });

        it('should handle null KID gracefully', async () => {
            mockActiveKidCache.get.mockResolvedValue(null);

            const result = await resolver.getActiveKid('EXAMPLE');

            expect(result).toBeNull();
        });

        it('should handle undefined KID gracefully', async () => {
            mockActiveKidCache.get.mockResolvedValue(undefined);

            const result = await resolver.getActiveKid('EXAMPLE');

            expect(result).toBeUndefined();
        });
    });

    describe('getSigningKey', () => {
        let resolver;
        let mockLoader;
        let mockActiveKidCache;

        beforeEach(() => {
            mockLoader = { getPrivateKey: vi.fn(), loadPrivateKey: vi.fn() };
            mockActiveKidCache = { get: vi.fn(), set: vi.fn() };
            resolver = new KeyResolver({ loader: mockLoader, ActiveKidCache: mockActiveKidCache });
        });

        it('should get active KID and load private key via getPrivateKey', async () => {
            const kid = 'kid-789';
            const privateKey = { key: 'private-key-data' };
            mockActiveKidCache.get.mockResolvedValue(kid);
            mockLoader.getPrivateKey.mockResolvedValue(privateKey);

            const result = await resolver.getSigningKey('DOMAIN_A');

            expect(mockActiveKidCache.get).toHaveBeenCalledTimes(1);
            expect(mockLoader.getPrivateKey).toHaveBeenCalledWith(kid);
            expect(result).toEqual({ privateKey });
        });

        it('should propagate errors from getActiveKid', async () => {
            const error = new Error('Failed to get active KID');
            mockActiveKidCache.get.mockRejectedValue(error);

            await expect(resolver.getSigningKey('DOMAIN_B'))
                .rejects.toThrow('Failed to get active KID');
            expect(mockLoader.getPrivateKey).not.toHaveBeenCalled();
        });

        it('should propagate errors from loader.getPrivateKey', async () => {
            mockActiveKidCache.get.mockResolvedValue('kid-999');
            const error = new Error('Key file not found');
            mockLoader.getPrivateKey.mockRejectedValue(error);

            await expect(resolver.getSigningKey('DOMAIN_C'))
                .rejects.toThrow('Key file not found');
        });

        it('should handle null KID from ActiveKidCache', async () => {
            mockActiveKidCache.get.mockResolvedValue(null);
            mockLoader.getPrivateKey.mockResolvedValue(null);

            const result = await resolver.getSigningKey('DOMAIN_D');

            expect(mockLoader.getPrivateKey).toHaveBeenCalledWith(null);
            expect(result).toEqual({ privateKey: null });
        });

        it('should work with different domain names', async () => {
            const testCases = ['DOMAIN1', 'DOMAIN_2', 'DOMAIN-3', 'D'];
            mockActiveKidCache.get.mockResolvedValue('kid-123');
            mockLoader.getPrivateKey.mockResolvedValue({ key: 'test' });

            for (const domain of testCases) {
                await resolver.getSigningKey(domain);
            }

            expect(mockActiveKidCache.get).toHaveBeenCalledTimes(testCases.length);
            expect(mockLoader.getPrivateKey).toHaveBeenCalledTimes(testCases.length);
        });
    });

    describe('getVerificationKey', () => {
        let resolver;
        let mockLoader;
        let mockActiveKidCache;

        beforeEach(() => {
            mockLoader = { getPrivateKey: vi.fn(), loadPrivateKey: vi.fn() };
            mockActiveKidCache = { get: vi.fn(), set: vi.fn() };
            resolver = new KeyResolver({ loader: mockLoader, ActiveKidCache: mockActiveKidCache });
        });

        it('should get active KID and load private key via loadPrivateKey', async () => {
            const kid = 'kid-verification-1';
            const privateKey = { key: 'verification-key-data' };
            mockActiveKidCache.get.mockResolvedValue(kid);
            mockLoader.loadPrivateKey.mockResolvedValue(privateKey);

            const result = await resolver.getVerificationKey('VERIFY_DOMAIN');

            expect(mockActiveKidCache.get).toHaveBeenCalledTimes(1);
            expect(mockLoader.loadPrivateKey).toHaveBeenCalledWith(kid);
            expect(result).toBe(privateKey);
        });

        it('should use different loader method than getSigningKey', async () => {
            mockActiveKidCache.get.mockResolvedValue('kid-123');
            mockLoader.loadPrivateKey.mockResolvedValue({ key: 'data' });

            await resolver.getVerificationKey('DOMAIN');

            expect(mockLoader.loadPrivateKey).toHaveBeenCalledWith('kid-123');
            expect(mockLoader.getPrivateKey).not.toHaveBeenCalled();
        });

        it('should propagate errors from getActiveKid', async () => {
            const error = new Error('KID retrieval failed');
            mockActiveKidCache.get.mockRejectedValue(error);

            await expect(resolver.getVerificationKey('DOMAIN_E'))
                .rejects.toThrow('KID retrieval failed');
            expect(mockLoader.loadPrivateKey).not.toHaveBeenCalled();
        });

        it('should propagate errors from loader.loadPrivateKey', async () => {
            mockActiveKidCache.get.mockResolvedValue('kid-error');
            const error = new Error('Private key loading failed');
            mockLoader.loadPrivateKey.mockRejectedValue(error);

            await expect(resolver.getVerificationKey('DOMAIN_F'))
                .rejects.toThrow('Private key loading failed');
        });

        it('should handle null KID', async () => {
            mockActiveKidCache.get.mockResolvedValue(null);
            mockLoader.loadPrivateKey.mockResolvedValue(null);

            const result = await resolver.getVerificationKey('DOMAIN_G');

            expect(mockLoader.loadPrivateKey).toHaveBeenCalledWith(null);
            expect(result).toBeNull();
        });

        it('should confirm correct method name (getVerificationKey)', () => {
            expect(resolver.getVerificationKey).toBeDefined();
            expect(resolver.getVarificationKey).toBeUndefined();
        });
    });

    describe('setActiveKid', () => {
        let resolver;
        let mockLoader;
        let mockActiveKidCache;

        beforeEach(() => {
            mockLoader = { getPrivateKey: vi.fn(), loadPrivateKey: vi.fn() };
            mockActiveKidCache = { get: vi.fn(), set: vi.fn() };
            resolver = new KeyResolver({ loader: mockLoader, ActiveKidCache: mockActiveKidCache });
        });

        it('should call ActiveKidCache.set with domain and kid', async () => {
            mockActiveKidCache.set.mockResolvedValue(true);

            const result = await resolver.setActiveKid('DOMAIN_H', 'new-kid-123');

            expect(mockActiveKidCache.set).toHaveBeenCalledWith('DOMAIN_H', 'new-kid-123');
            expect(result).toBe(true);
        });

        it('should return result from ActiveKidCache.set', async () => {
            const expectedResult = { success: true, previousKid: 'old-kid' };
            mockActiveKidCache.set.mockResolvedValue(expectedResult);

            const result = await resolver.setActiveKid('DOMAIN_I', 'kid-456');

            expect(result).toEqual(expectedResult);
        });

        it('should propagate errors from ActiveKidCache', async () => {
            const error = new Error('Failed to set active KID');
            mockActiveKidCache.set.mockRejectedValue(error);

            await expect(resolver.setActiveKid('DOMAIN_J', 'kid-789'))
                .rejects.toThrow('Failed to set active KID');
        });

        it('should handle various KID formats', async () => {
            const kidFormats = [
                'simple-kid',
                'KID_WITH_UNDERSCORES',
                'kid-123-456',
                '12345',
                'UPPER'
            ];
            mockActiveKidCache.set.mockResolvedValue(true);

            for (const kid of kidFormats) {
                await resolver.setActiveKid('DOMAIN', kid);
            }

            expect(mockActiveKidCache.set).toHaveBeenCalledTimes(kidFormats.length);
        });

        it('should handle various domain formats', async () => {
            const domainFormats = ['DOMAIN1', 'DOMAIN_2', 'DOMAIN-3', 'D'];
            mockActiveKidCache.set.mockResolvedValue(true);

            for (const domain of domainFormats) {
                await resolver.setActiveKid(domain, 'kid-test');
            }

            expect(mockActiveKidCache.set).toHaveBeenCalledTimes(domainFormats.length);
        });

        it('should handle null kid', async () => {
            mockActiveKidCache.set.mockResolvedValue(false);

            const result = await resolver.setActiveKid('DOMAIN_K', null);

            expect(mockActiveKidCache.set).toHaveBeenCalledWith('DOMAIN_K', null);
            expect(result).toBe(false);
        });

        it('should handle undefined kid', async () => {
            mockActiveKidCache.set.mockResolvedValue(false);

            const result = await resolver.setActiveKid('DOMAIN_L', undefined);

            expect(mockActiveKidCache.set).toHaveBeenCalledWith('DOMAIN_L', undefined);
            expect(result).toBe(false);
        });
    });

    describe('integration scenarios', () => {
        it('should coordinate getActiveKid -> getSigningKey flow', async () => {
            const mockLoader = { getPrivateKey: vi.fn(), loadPrivateKey: vi.fn() };
            const mockActiveKidCache = { get: vi.fn(), set: vi.fn() };
            const resolver = new KeyResolver({ loader: mockLoader, ActiveKidCache: mockActiveKidCache });

            const kid = 'integration-kid-1';
            const key = { privateKey: 'data' };
            mockActiveKidCache.get.mockResolvedValue(kid);
            mockLoader.getPrivateKey.mockResolvedValue(key);

            const activeKid = await resolver.getActiveKid('TEST');
            const signingKey = await resolver.getSigningKey('TEST');

            expect(activeKid).toBe(kid);
            expect(signingKey).toEqual({ privateKey: key });
            expect(mockActiveKidCache.get).toHaveBeenCalledTimes(2);
        });

        it('should coordinate setActiveKid -> getSigningKey flow', async () => {
            const mockLoader = { getPrivateKey: vi.fn(), loadPrivateKey: vi.fn() };
            const mockActiveKidCache = { get: vi.fn(), set: vi.fn() };
            const resolver = new KeyResolver({ loader: mockLoader, ActiveKidCache: mockActiveKidCache });

            const newKid = 'new-kid-integration';
            const key = { privateKey: 'new-data' };
            mockActiveKidCache.set.mockResolvedValue(true);
            mockActiveKidCache.get.mockResolvedValue(newKid);
            mockLoader.getPrivateKey.mockResolvedValue(key);

            await resolver.setActiveKid('DOMAIN', newKid);
            const signingKey = await resolver.getSigningKey('DOMAIN');

            expect(signingKey).toEqual({ privateKey: key });
            expect(mockLoader.getPrivateKey).toHaveBeenCalledWith(newKid);
        });

        it('should differentiate between getSigningKey and getVerificationKey', async () => {
            const mockLoader = { getPrivateKey: vi.fn(), loadPrivateKey: vi.fn() };
            const mockActiveKidCache = { get: vi.fn(), set: vi.fn() };
            const resolver = new KeyResolver({ loader: mockLoader, ActiveKidCache: mockActiveKidCache });

            const kid = 'multi-method-kid';
            mockActiveKidCache.get.mockResolvedValue(kid);
            mockLoader.getPrivateKey.mockResolvedValue({ method: 'getPrivateKey' });
            mockLoader.loadPrivateKey.mockResolvedValue({ method: 'loadPrivateKey' });

            const signingKey = await resolver.getSigningKey('DOMAIN');
            const verificationKey = await resolver.getVerificationKey('DOMAIN');

            expect(signingKey.privateKey.method).toBe('getPrivateKey');
            expect(verificationKey.method).toBe('loadPrivateKey');
            expect(mockLoader.getPrivateKey).toHaveBeenCalledWith(kid);
            expect(mockLoader.loadPrivateKey).toHaveBeenCalledWith(kid);
        });

        it('should handle concurrent calls to same domain', async () => {
            const mockLoader = { getPrivateKey: vi.fn(), loadPrivateKey: vi.fn() };
            const mockActiveKidCache = { get: vi.fn(), set: vi.fn() };
            const resolver = new KeyResolver({ loader: mockLoader, ActiveKidCache: mockActiveKidCache });

            mockActiveKidCache.get.mockResolvedValue('concurrent-kid');
            mockLoader.getPrivateKey.mockResolvedValue({ key: 'data' });

            const promises = Array(5).fill(null).map(() =>
                resolver.getSigningKey('CONCURRENT_DOMAIN')
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(5);
            expect(mockActiveKidCache.get).toHaveBeenCalledTimes(5);
            expect(mockLoader.getPrivateKey).toHaveBeenCalledTimes(5);
        });
    });
});
