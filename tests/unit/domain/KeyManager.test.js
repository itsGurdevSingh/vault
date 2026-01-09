import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyManager } from '../../../src/domain/key-manager/KeyManager.js';

describe('KeyManager', () => {
    describe('constructor', () => {
        it('should create instance with all dependencies', () => {
            const deps = {
                loader: {},
                generator: {},
                janitor: {},
                builder: {},
                signer: {},
                keyRotator: {},
                rotationScheduler: {},
                keyResolver: {},
                configManager: {},
                normalizer: {}
            };

            const manager = new KeyManager(deps);

            expect(manager).toBeInstanceOf(KeyManager);
            expect(manager.loader).toBe(deps.loader);
            expect(manager.generator).toBe(deps.generator);
            expect(manager.janitor).toBe(deps.janitor);
            expect(manager.builder).toBe(deps.builder);
            expect(manager.signer).toBe(deps.signer);
            expect(manager.rotator).toBe(deps.keyRotator);
            expect(manager.scheduler).toBe(deps.rotationScheduler);
            expect(manager.keyResolver).toBe(deps.keyResolver);
            expect(manager.config).toBe(deps.configManager);
            expect(manager.normalizer).toBe(deps.normalizer);
        });

        it('should map rotationScheduler to scheduler', () => {
            const mockScheduler = { run: vi.fn() };
            const manager = new KeyManager({ rotationScheduler: mockScheduler });

            expect(manager.scheduler).toBe(mockScheduler);
        });

        it('should map keyRotator to rotator', () => {
            const mockRotator = { rotate: vi.fn() };
            const manager = new KeyManager({ keyRotator: mockRotator });

            expect(manager.rotator).toBe(mockRotator);
        });

        it('should map configManager to config', () => {
            const mockConfig = { configure: vi.fn() };
            const manager = new KeyManager({ configManager: mockConfig });

            expect(manager.config).toBe(mockConfig);
        });
    });

    describe('sign', () => {
        let manager;
        let mockNormalizer;
        let mockSigner;

        beforeEach(() => {
            mockNormalizer = {
                normalizeDomain: vi.fn().mockImplementation(d => d.toUpperCase())
            };
            mockSigner = {
                sign: vi.fn().mockResolvedValue({ token: 'signed' })
            };
            manager = new KeyManager({ normalizer: mockNormalizer, signer: mockSigner });
        });

        it('should normalize domain and delegate to signer', async () => {
            const payload = { userId: 123 };
            const opts = { expiresIn: '1h' };

            const result = await manager.sign('example', payload, opts);

            expect(mockNormalizer.normalizeDomain).toHaveBeenCalledWith('example');
            expect(mockSigner.sign).toHaveBeenCalledWith('EXAMPLE', payload, opts);
            expect(result).toEqual({ token: 'signed' });
        });

        it('should handle different domain formats', async () => {
            await manager.sign('test-domain', {}, {});

            expect(mockNormalizer.normalizeDomain).toHaveBeenCalledWith('test-domain');
            expect(mockSigner.sign).toHaveBeenCalledWith('TEST-DOMAIN', {}, {});
        });

        it('should pass payload correctly', async () => {
            const complexPayload = {
                user: { id: 1, name: 'test' },
                permissions: ['read', 'write']
            };

            await manager.sign('domain', complexPayload, {});

            expect(mockSigner.sign).toHaveBeenCalledWith('DOMAIN', complexPayload, {});
        });

        it('should pass options correctly', async () => {
            const opts = { expiresIn: '2h', algorithm: 'RS256' };

            await manager.sign('domain', {}, opts);

            expect(mockSigner.sign).toHaveBeenCalledWith('DOMAIN', {}, opts);
        });

        it('should propagate errors from signer', async () => {
            mockSigner.sign.mockRejectedValue(new Error('Sign failed'));

            await expect(manager.sign('domain', {}, {}))
                .rejects.toThrow('Sign failed');
        });
    });

    describe('getJwks', () => {
        let manager;
        let mockNormalizer;
        let mockBuilder;

        beforeEach(() => {
            mockNormalizer = {
                normalizeDomain: vi.fn().mockImplementation(d => d.toUpperCase())
            };
            mockBuilder = {
                getJwks: vi.fn().mockResolvedValue({ keys: [] })
            };
            manager = new KeyManager({ normalizer: mockNormalizer, builder: mockBuilder });
        });

        it('should normalize domain and delegate to builder', async () => {
            const result = await manager.getJwks('example');

            expect(mockNormalizer.normalizeDomain).toHaveBeenCalledWith('example');
            expect(mockBuilder.getJwks).toHaveBeenCalledWith('EXAMPLE');
            expect(result).toEqual({ keys: [] });
        });

        it('should handle JWKS with multiple keys', async () => {
            const jwks = { keys: [{ kid: '1' }, { kid: '2' }] };
            mockBuilder.getJwks.mockResolvedValue(jwks);

            const result = await manager.getJwks('domain');

            expect(result).toEqual(jwks);
        });

        it('should propagate errors from builder', async () => {
            mockBuilder.getJwks.mockRejectedValue(new Error('JWKS build failed'));

            await expect(manager.getJwks('domain'))
                .rejects.toThrow('JWKS build failed');
        });
    });

    describe('getPublicKey', () => {
        let manager;
        let mockNormalizer;
        let mockLoader;

        beforeEach(() => {
            mockNormalizer = {
                normalizeDomain: vi.fn().mockImplementation(d => d.toUpperCase())
            };
            mockLoader = {
                getPublicKey: vi.fn().mockResolvedValue({ key: 'public' })
            };
            manager = new KeyManager({ normalizer: mockNormalizer, loader: mockLoader });
        });

        it('should normalize domain and delegate to loader', async () => {
            const result = await manager.getPublicKey('example', 'kid-123');

            expect(mockNormalizer.normalizeDomain).toHaveBeenCalledWith('example');
            expect(mockLoader.getPublicKey).toHaveBeenCalledWith('EXAMPLE', 'kid-123');
            expect(result).toEqual({ key: 'public' });
        });

        it('should pass kid parameter correctly', async () => {
            await manager.getPublicKey('domain', 'specific-kid-456');

            expect(mockLoader.getPublicKey).toHaveBeenCalledWith('DOMAIN', 'specific-kid-456');
        });

        it('should propagate errors from loader', async () => {
            mockLoader.getPublicKey.mockRejectedValue(new Error('Key not found'));

            await expect(manager.getPublicKey('domain', 'missing-kid'))
                .rejects.toThrow('Key not found');
        });
    });

    describe('initialSetup', () => {
        let manager;
        let mockNormalizer;
        let mockGenerator;
        let mockKeyResolver;

        beforeEach(() => {
            mockNormalizer = {
                normalizeDomain: vi.fn().mockImplementation(d => d.toUpperCase())
            };
            mockGenerator = {
                generate: vi.fn().mockResolvedValue('new-kid-123')
            };
            mockKeyResolver = {
                setActiveKid: vi.fn().mockResolvedValue(true)
            };
            manager = new KeyManager({
                normalizer: mockNormalizer,
                generator: mockGenerator,
                keyResolver: mockKeyResolver
            });
        });

        it('should normalize domain, generate key, and set active', async () => {
            const result = await manager.initialSetup('new-domain');

            expect(mockNormalizer.normalizeDomain).toHaveBeenCalledWith('new-domain');
            expect(mockGenerator.generate).toHaveBeenCalledWith('NEW-DOMAIN');
            expect(mockKeyResolver.setActiveKid).toHaveBeenCalledWith('NEW-DOMAIN', 'new-kid-123');
            expect(result).toEqual({ success: true, kid: 'new-kid-123' });
        });

        it('should execute operations in correct order', async () => {
            const callOrder = [];
            mockGenerator.generate.mockImplementation(async () => {
                callOrder.push('generate');
                return 'kid-1';
            });
            mockKeyResolver.setActiveKid.mockImplementation(async () => {
                callOrder.push('setActiveKid');
            });

            await manager.initialSetup('domain');

            expect(callOrder).toEqual(['generate', 'setActiveKid']);
        });

        it('should propagate errors from generator', async () => {
            mockGenerator.generate.mockRejectedValue(new Error('Generation failed'));

            await expect(manager.initialSetup('domain'))
                .rejects.toThrow('Generation failed');
            expect(mockKeyResolver.setActiveKid).not.toHaveBeenCalled();
        });

        it('should propagate errors from keyResolver', async () => {
            mockKeyResolver.setActiveKid.mockRejectedValue(new Error('Set active failed'));

            await expect(manager.initialSetup('domain'))
                .rejects.toThrow('Set active failed');
        });

        it('should return success with generated kid', async () => {
            mockGenerator.generate.mockResolvedValue('unique-kid-789');

            const result = await manager.initialSetup('domain');

            expect(result.success).toBe(true);
            expect(result.kid).toBe('unique-kid-789');
        });
    });

    describe('rotate (immediate rotation - no args)', () => {
        let manager;
        let mockScheduler;

        beforeEach(() => {
            mockScheduler = {
                triggerImmediateRotation: vi.fn().mockResolvedValue({ rotated: 2 })
            };
            manager = new KeyManager({ rotationScheduler: mockScheduler });
        });

        it('should delegate to scheduler.triggerImmediateRotation', async () => {
            const result = await manager.rotate();

            expect(mockScheduler.triggerImmediateRotation).toHaveBeenCalled();
            expect(result).toEqual({ rotated: 2 });
        });

        it('should propagate errors from scheduler', async () => {
            mockScheduler.triggerImmediateRotation.mockRejectedValue(new Error('Rotation failed'));

            await expect(manager.rotate())
                .rejects.toThrow('Rotation failed');
        });
    });

    describe('rotateDomain (domain-specific rotation)', () => {
        let manager;
        let mockNormalizer;
        let mockRotator;

        beforeEach(() => {
            mockNormalizer = {
                normalizeDomain: vi.fn().mockImplementation(d => d.toUpperCase())
            };
            mockRotator = {
                triggerDomainRotation: vi.fn().mockResolvedValue({ success: true })
            };
            manager = new KeyManager({
                normalizer: mockNormalizer,
                keyRotator: mockRotator
            });
        });

        it('should normalize domain and delegate to rotator', async () => {
            const result = await manager.rotateDomain('specific-domain');

            expect(mockNormalizer.normalizeDomain).toHaveBeenCalledWith('specific-domain');
            expect(mockRotator.triggerDomainRotation).toHaveBeenCalledWith('SPECIFIC-DOMAIN');
            expect(result).toEqual({ success: true });
        });

        it('should handle different domain names', async () => {
            await manager.rotateDomain('test-123');

            expect(mockNormalizer.normalizeDomain).toHaveBeenCalledWith('test-123');
            expect(mockRotator.triggerDomainRotation).toHaveBeenCalledWith('TEST-123');
        });

        it('should propagate errors from rotator', async () => {
            mockRotator.triggerDomainRotation.mockRejectedValue(new Error('Domain rotation failed'));

            await expect(manager.rotateDomain('domain'))
                .rejects.toThrow('Domain rotation failed');
        });
    });

    describe('scheduleRotation', () => {
        let manager;
        let mockScheduler;

        beforeEach(() => {
            mockScheduler = {
                runScheduledRotation: vi.fn().mockResolvedValue({ processed: 5 })
            };
            manager = new KeyManager({ rotationScheduler: mockScheduler });
        });

        it('should delegate to scheduler.runScheduledRotation', async () => {
            const result = await manager.scheduleRotation();

            expect(mockScheduler.runScheduledRotation).toHaveBeenCalled();
            expect(result).toEqual({ processed: 5 });
        });

        it('should propagate errors from scheduler', async () => {
            mockScheduler.runScheduledRotation.mockRejectedValue(new Error('Schedule failed'));

            await expect(manager.scheduleRotation())
                .rejects.toThrow('Schedule failed');
        });
    });

    describe('configure', () => {
        let manager;
        let mockConfig;

        beforeEach(() => {
            mockConfig = {
                configure: vi.fn()
            };
            manager = new KeyManager({ configManager: mockConfig });
        });

        it('should delegate to config.configure', () => {
            const opts = { retryIntervalMs: 5000, maxRetries: 3 };

            manager.configure(opts);

            expect(mockConfig.configure).toHaveBeenCalledWith(opts);
        });

        it('should handle empty options', () => {
            manager.configure({});

            expect(mockConfig.configure).toHaveBeenCalledWith({});
        });

        it('should handle partial options', () => {
            manager.configure({ retryIntervalMs: 10000 });

            expect(mockConfig.configure).toHaveBeenCalledWith({ retryIntervalMs: 10000 });
        });
    });

    describe('integration - facade pattern', () => {
        it('should act as facade over multiple sub-domains', () => {
            const manager = new KeyManager({
                loader: {},
                generator: {},
                janitor: {},
                builder: {},
                signer: {},
                keyRotator: {},
                rotationScheduler: {},
                keyResolver: {},
                configManager: {},
                normalizer: {}
            });

            // Verify all sub-domain access points exist
            expect(manager.loader).toBeDefined();
            expect(manager.generator).toBeDefined();
            expect(manager.janitor).toBeDefined();
            expect(manager.builder).toBeDefined();
            expect(manager.signer).toBeDefined();
            expect(manager.rotator).toBeDefined();
            expect(manager.scheduler).toBeDefined();
            expect(manager.keyResolver).toBeDefined();
            expect(manager.config).toBeDefined();
            expect(manager.normalizer).toBeDefined();
        });

        it('should provide public API methods', () => {
            const manager = new KeyManager({ normalizer: {}, signer: {}, builder: {}, loader: {} });

            expect(typeof manager.sign).toBe('function');
            expect(typeof manager.getJwks).toBe('function');
            expect(typeof manager.getPublicKey).toBe('function');
        });

        it('should provide lifecycle API methods', () => {
            const manager = new KeyManager({
                normalizer: {},
                generator: {},
                keyResolver: {},
                keyRotator: {},
                rotationScheduler: {}
            });

            expect(typeof manager.initialSetup).toBe('function');
            expect(typeof manager.rotate).toBe('function');
            expect(typeof manager.rotateDomain).toBe('function');
            expect(typeof manager.scheduleRotation).toBe('function');
        });

        it('should provide configuration API', () => {
            const manager = new KeyManager({ configManager: {} });

            expect(typeof manager.configure).toBe('function');
        });
    });

    describe('domain normalization consistency', () => {
        it('should normalize domains consistently across all methods', async () => {
            const mockNormalizer = {
                normalizeDomain: vi.fn().mockImplementation(d => d.toUpperCase())
            };

            const manager = new KeyManager({
                normalizer: mockNormalizer,
                signer: { sign: vi.fn().mockResolvedValue({}) },
                builder: { getJwks: vi.fn().mockResolvedValue({}) },
                loader: { getPublicKey: vi.fn().mockResolvedValue({}) },
                generator: { generate: vi.fn().mockResolvedValue('kid') },
                keyResolver: { setActiveKid: vi.fn().mockResolvedValue(true) },
                keyRotator: { triggerDomainRotation: vi.fn().mockResolvedValue({}) }
            });

            await manager.sign('test', {}, {});
            await manager.getJwks('test');
            await manager.getPublicKey('test', 'kid');
            await manager.initialSetup('test');
            await manager.rotateDomain('test');

            // Verify normalization was called for each domain-aware method
            expect(mockNormalizer.normalizeDomain).toHaveBeenCalledTimes(5);
            mockNormalizer.normalizeDomain.mock.calls.forEach(call => {
                expect(call[0]).toBe('test');
            });
        });
    });
});
