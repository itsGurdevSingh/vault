import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyResolver } from '../../../../src/domain/key-manager/utils/keyResolver.js';

describe('KeyResolver', () => {
    describe('constructor', () => {
        it('should create instance with loader and kidStore', () => {
            const mockLoader = { getPvtKey: vi.fn(), loadPrivateKey: vi.fn() };
            const mockKidStore = { getActiveKid: vi.fn(), setActiveKid: vi.fn() };

            const resolver = new KeyResolver({ loader: mockLoader, kidStore: mockKidStore });

            expect(resolver).toBeInstanceOf(KeyResolver);
            expect(resolver.loader).toBe(mockLoader);
            expect(resolver.kidStore).toBe(mockKidStore);
        });

        it('should accept missing loader (no validation in constructor)', () => {
            const mockKidStore = { getActiveKid: vi.fn() };

            const resolver = new KeyResolver({ kidStore: mockKidStore });

            expect(resolver.loader).toBeUndefined();
            expect(resolver.kidStore).toBe(mockKidStore);
        });

        it('should accept missing kidStore (no validation in constructor)', () => {
            const mockLoader = { getPvtKey: vi.fn() };

            const resolver = new KeyResolver({ loader: mockLoader });

            expect(resolver.loader).toBe(mockLoader);
            expect(resolver.kidStore).toBeUndefined();
        });
    });

    describe('getActiveKID', () => {
        let resolver;
        let mockLoader;
        let mockKidStore;

        beforeEach(() => {
            mockLoader = { getPvtKey: vi.fn(), loadPrivateKey: vi.fn() };
            mockKidStore = { getActiveKid: vi.fn(), setActiveKid: vi.fn() };
            resolver = new KeyResolver({ loader: mockLoader, kidStore: mockKidStore });
        });

        it('should call kidStore.getActiveKid and return result', async () => {
            const expectedKid = 'kid-123';
            mockKidStore.getActiveKid.mockResolvedValue(expectedKid);

            const result = await resolver.getActiveKID('EXAMPLE');

            expect(mockKidStore.getActiveKid).toHaveBeenCalledTimes(1);
            expect(result).toBe(expectedKid);
        });

        it('should pass domain parameter to kidStore (bug fix)', async () => {
            mockKidStore.getActiveKid.mockResolvedValue('kid-456');

            await resolver.getActiveKid('ANY_DOMAIN');

            // Verifies bug fix: now correctly passes domain to kidStore.getActiveKid()
            expect(mockKidStore.getActiveKid).toHaveBeenCalledWith('ANY_DOMAIN');
        });

        it('should propagate errors from kidStore', async () => {
            const error = new Error('KID store unavailable');
            mockKidStore.getActiveKid.mockRejectedValue(error);

            await expect(resolver.getActiveKID('EXAMPLE'))
                .rejects.toThrow('KID store unavailable');
        });

        it('should handle null KID gracefully', async () => {
            mockKidStore.getActiveKid.mockResolvedValue(null);

            const result = await resolver.getActiveKID('EXAMPLE');

            expect(result).toBeNull();
        });

        it('should handle undefined KID gracefully', async () => {
            mockKidStore.getActiveKid.mockResolvedValue(undefined);

            const result = await resolver.getActiveKID('EXAMPLE');

            expect(result).toBeUndefined();
        });
    });

    describe('getSigningKey', () => {
        let resolver;
        let mockLoader;
        let mockKidStore;

        beforeEach(() => {
            mockLoader = { getPvtKey: vi.fn(), loadPrivateKey: vi.fn() };
            mockKidStore = { getActiveKid: vi.fn(), setActiveKid: vi.fn() };
            resolver = new KeyResolver({ loader: mockLoader, kidStore: mockKidStore });
        });

        it('should get active KID and load private key via getPvtKey', async () => {
            const kid = 'kid-789';
            const privateKey = { key: 'private-key-data' };
            mockKidStore.getActiveKid.mockResolvedValue(kid);
            mockLoader.getPvtKey.mockResolvedValue(privateKey);

            const result = await resolver.getSigningKey('DOMAIN_A');

            expect(mockKidStore.getActiveKid).toHaveBeenCalledTimes(1);
            expect(mockLoader.getPvtKey).toHaveBeenCalledWith(kid);
            // getSigningKey wraps the result in { privateKey: ... }
            expect(result).toEqual({ privateKey });
        });

        it('should propagate errors from getActiveKID', async () => {
            const error = new Error('Failed to get active KID');
            mockKidStore.getActiveKid.mockRejectedValue(error);

            await expect(resolver.getSigningKey('DOMAIN_B'))
                .rejects.toThrow('Failed to get active KID');
            expect(mockLoader.getPvtKey).not.toHaveBeenCalled();
        });

        it('should propagate errors from loader.getPvtKey', async () => {
            mockKidStore.getActiveKid.mockResolvedValue('kid-999');
            const error = new Error('Key file not found');
            mockLoader.getPvtKey.mockRejectedValue(error);

            await expect(resolver.getSigningKey('DOMAIN_C'))
                .rejects.toThrow('Key file not found');
        });

        it('should handle null KID from kidStore', async () => {
            mockKidStore.getActiveKid.mockResolvedValue(null);
            mockLoader.getPvtKey.mockResolvedValue(null);

            const result = await resolver.getSigningKey('DOMAIN_D');

            expect(mockLoader.getPvtKey).toHaveBeenCalledWith(null);
            // getSigningKey wraps the result in { privateKey: ... }
            expect(result).toEqual({ privateKey: null });
        });

        it('should work with different domain names', async () => {
            const testCases = ['DOMAIN1', 'DOMAIN_2', 'DOMAIN-3', 'D'];
            mockKidStore.getActiveKid.mockResolvedValue('kid-123');
            mockLoader.getPvtKey.mockResolvedValue({ key: 'test' });

            for (const domain of testCases) {
                await resolver.getSigningKey(domain);
            }

            expect(mockKidStore.getActiveKid).toHaveBeenCalledTimes(testCases.length);
            expect(mockLoader.getPvtKey).toHaveBeenCalledTimes(testCases.length);
        });
    });

    describe('getVarificationKey', () => {
        let resolver;
        let mockLoader;
        let mockKidStore;

        beforeEach(() => {
            mockLoader = { getPvtKey: vi.fn(), loadPrivateKey: vi.fn() };
            mockKidStore = { getActiveKid: vi.fn(), setActiveKid: vi.fn() };
            resolver = new KeyResolver({ loader: mockLoader, kidStore: mockKidStore });
        });

        it('should get active KID and load private key via loadPrivateKey', async () => {
            const kid = 'kid-verification-1';
            const privateKey = { key: 'verification-key-data' };
            mockKidStore.getActiveKid.mockResolvedValue(kid);
            mockLoader.loadPrivateKey.mockResolvedValue(privateKey);

            const result = await resolver.getVarificationKey('VERIFY_DOMAIN');

            expect(mockKidStore.getActiveKid).toHaveBeenCalledTimes(1);
            expect(mockLoader.loadPrivateKey).toHaveBeenCalledWith(kid);
            expect(result).toBe(privateKey);
        });

        it('should use different loader method than getSigningKey', async () => {
            mockKidStore.getActiveKid.mockResolvedValue('kid-123');
            mockLoader.loadPrivateKey.mockResolvedValue({ key: 'data' });

            await resolver.getVarificationKey('DOMAIN');

            expect(mockLoader.loadPrivateKey).toHaveBeenCalledWith('kid-123');
            expect(mockLoader.getPvtKey).not.toHaveBeenCalled();
        });

        it('should propagate errors from getActiveKID', async () => {
            const error = new Error('KID retrieval failed');
            mockKidStore.getActiveKid.mockRejectedValue(error);

            await expect(resolver.getVarificationKey('DOMAIN_E'))
                .rejects.toThrow('KID retrieval failed');
            expect(mockLoader.loadPrivateKey).not.toHaveBeenCalled();
        });

        it('should propagate errors from loader.loadPrivateKey', async () => {
            mockKidStore.getActiveKid.mockResolvedValue('kid-error');
            const error = new Error('Private key loading failed');
            mockLoader.loadPrivateKey.mockRejectedValue(error);

            await expect(resolver.getVarificationKey('DOMAIN_F'))
                .rejects.toThrow('Private key loading failed');
        });

        it('should handle null KID', async () => {
            mockKidStore.getActiveKid.mockResolvedValue(null);
            mockLoader.loadPrivateKey.mockResolvedValue(null);

            const result = await resolver.getVarificationKey('DOMAIN_G');

            expect(mockLoader.loadPrivateKey).toHaveBeenCalledWith(null);
            expect(result).toBeNull();
        });

        it('should note typo in method name (getVarificationKey instead of getVerificationKey)', () => {
            // Documentation test: highlights typo in source code
            expect(resolver.getVarificationKey).toBeDefined();
            expect(resolver.getVerificationKey).toBeUndefined();
        });
    });

    describe('setActiveKid', () => {
        let resolver;
        let mockLoader;
        let mockKidStore;

        beforeEach(() => {
            mockLoader = { getPvtKey: vi.fn(), loadPrivateKey: vi.fn() };
            mockKidStore = { getActiveKid: vi.fn(), setActiveKid: vi.fn() };
            resolver = new KeyResolver({ loader: mockLoader, kidStore: mockKidStore });
        });

        it('should call kidStore.setActiveKid with domain and kid', async () => {
            mockKidStore.setActiveKid.mockResolvedValue(true);

            const result = await resolver.setActiveKid('DOMAIN_H', 'new-kid-123');

            expect(mockKidStore.setActiveKid).toHaveBeenCalledWith('DOMAIN_H', 'new-kid-123');
            expect(result).toBe(true);
        });

        it('should return result from kidStore.setActiveKid', async () => {
            const expectedResult = { success: true, previousKid: 'old-kid' };
            mockKidStore.setActiveKid.mockResolvedValue(expectedResult);

            const result = await resolver.setActiveKid('DOMAIN_I', 'kid-456');

            expect(result).toEqual(expectedResult);
        });

        it('should propagate errors from kidStore', async () => {
            const error = new Error('Failed to set active KID');
            mockKidStore.setActiveKid.mockRejectedValue(error);

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
            mockKidStore.setActiveKid.mockResolvedValue(true);

            for (const kid of kidFormats) {
                await resolver.setActiveKid('DOMAIN', kid);
            }

            expect(mockKidStore.setActiveKid).toHaveBeenCalledTimes(kidFormats.length);
        });

        it('should handle various domain formats', async () => {
            const domainFormats = ['DOMAIN1', 'DOMAIN_2', 'DOMAIN-3', 'D'];
            mockKidStore.setActiveKid.mockResolvedValue(true);

            for (const domain of domainFormats) {
                await resolver.setActiveKid(domain, 'kid-test');
            }

            expect(mockKidStore.setActiveKid).toHaveBeenCalledTimes(domainFormats.length);
        });

        it('should handle null kid', async () => {
            mockKidStore.setActiveKid.mockResolvedValue(false);

            const result = await resolver.setActiveKid('DOMAIN_K', null);

            expect(mockKidStore.setActiveKid).toHaveBeenCalledWith('DOMAIN_K', null);
            expect(result).toBe(false);
        });

        it('should handle undefined kid', async () => {
            mockKidStore.setActiveKid.mockResolvedValue(false);

            const result = await resolver.setActiveKid('DOMAIN_L', undefined);

            expect(mockKidStore.setActiveKid).toHaveBeenCalledWith('DOMAIN_L', undefined);
            expect(result).toBe(false);
        });
    });

    describe('integration scenarios', () => {
        it('should coordinate getActiveKID -> getSigningKey flow', async () => {
            const mockLoader = { getPvtKey: vi.fn(), loadPrivateKey: vi.fn() };
            const mockKidStore = { getActiveKid: vi.fn(), setActiveKid: vi.fn() };
            const resolver = new KeyResolver({ loader: mockLoader, kidStore: mockKidStore });

            const kid = 'integration-kid-1';
            const key = { privateKey: 'data' };
            mockKidStore.getActiveKid.mockResolvedValue(kid);
            mockLoader.getPvtKey.mockResolvedValue(key);

            const activeKid = await resolver.getActiveKID('TEST');
            const signingKey = await resolver.getSigningKey('TEST');

            expect(activeKid).toBe(kid);
            // getSigningKey wraps the result
            expect(signingKey).toEqual({ privateKey: key });
            expect(mockKidStore.getActiveKid).toHaveBeenCalledTimes(2);
        });

        it('should coordinate setActiveKid -> getSigningKey flow', async () => {
            const mockLoader = { getPvtKey: vi.fn(), loadPrivateKey: vi.fn() };
            const mockKidStore = { getActiveKid: vi.fn(), setActiveKid: vi.fn() };
            const resolver = new KeyResolver({ loader: mockLoader, kidStore: mockKidStore });

            const newKid = 'new-kid-integration';
            const key = { privateKey: 'new-data' };
            mockKidStore.setActiveKid.mockResolvedValue(true);
            mockKidStore.getActiveKid.mockResolvedValue(newKid);
            mockLoader.getPvtKey.mockResolvedValue(key);

            await resolver.setActiveKid('DOMAIN', newKid);
            const signingKey = await resolver.getSigningKey('DOMAIN');

            // getSigningKey wraps the result
            expect(signingKey).toEqual({ privateKey: key });
            expect(mockLoader.getPvtKey).toHaveBeenCalledWith(newKid);
        });

        it('should differentiate between getSigningKey and getVarificationKey', async () => {
            const mockLoader = { getPvtKey: vi.fn(), loadPrivateKey: vi.fn() };
            const mockKidStore = { getActiveKid: vi.fn(), setActiveKid: vi.fn() };
            const resolver = new KeyResolver({ loader: mockLoader, kidStore: mockKidStore });

            const kid = 'multi-method-kid';
            mockKidStore.getActiveKid.mockResolvedValue(kid);
            mockLoader.getPvtKey.mockResolvedValue({ method: 'getPvtKey' });
            mockLoader.loadPrivateKey.mockResolvedValue({ method: 'loadPrivateKey' });

            const signingKey = await resolver.getSigningKey('DOMAIN');
            const verificationKey = await resolver.getVarificationKey('DOMAIN');

            // getSigningKey wraps result, getVarificationKey doesn't
            expect(signingKey.privateKey.method).toBe('getPvtKey');
            expect(verificationKey.method).toBe('loadPrivateKey');
            expect(mockLoader.getPvtKey).toHaveBeenCalledWith(kid);
            expect(mockLoader.loadPrivateKey).toHaveBeenCalledWith(kid);
        });

        it('should handle concurrent calls to same domain', async () => {
            const mockLoader = { getPvtKey: vi.fn(), loadPrivateKey: vi.fn() };
            const mockKidStore = { getActiveKid: vi.fn(), setActiveKid: vi.fn() };
            const resolver = new KeyResolver({ loader: mockLoader, kidStore: mockKidStore });

            mockKidStore.getActiveKid.mockResolvedValue('concurrent-kid');
            mockLoader.getPvtKey.mockResolvedValue({ key: 'data' });

            const promises = Array(5).fill(null).map(() =>
                resolver.getSigningKey('CONCURRENT_DOMAIN')
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(5);
            expect(mockKidStore.getActiveKid).toHaveBeenCalledTimes(5);
            expect(mockLoader.getPvtKey).toHaveBeenCalledTimes(5);
        });
    });
});
