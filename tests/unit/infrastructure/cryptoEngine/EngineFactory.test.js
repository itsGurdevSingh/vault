import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EngineFactory } from '../../../../src/infrastructure/cryptoEngine/engineFactory.js';

describe('EngineFactory', () => {
  let mockCrypto;

  beforeEach(() => {
    mockCrypto = {
      generateKeyPair: vi.fn(),
      randomBytes: vi.fn(() => Buffer.from([0x12, 0x34, 0x56, 0x78])),
      webcrypto: {
        subtle: {}
      }
    };
    
    // Reset singleton instance
    EngineFactory._instance = null;
  });

  describe('constructor', () => {
    it('should initialize with crypto module', () => {
      const factory = new EngineFactory(mockCrypto);
      
      expect(factory.cryptoModule).toBe(mockCrypto);
    });
  });

  describe('create', () => {
    it('should create CryptoEngine instance', () => {
      const factory = new EngineFactory(mockCrypto);
      const engine = factory.create();

      expect(engine).toBeDefined();
      expect(engine.crypto).toBe(mockCrypto);
    });

    it('should inject config', () => {
      const factory = new EngineFactory(mockCrypto);
      const engine = factory.create();

      expect(engine.config).toBeDefined();
      expect(engine.config.MODULUS_LENGTH).toBe(4096);
      expect(engine.config.ALG_NAME).toBe('RSASSA-PKCS1-v1_5');
    });

    it('should inject utils', () => {
      const factory = new EngineFactory(mockCrypto);
      const engine = factory.create();

      expect(engine.utils).toBeDefined();
      expect(typeof engine.utils.pemToArrayBuffer).toBe('function');
      expect(typeof engine.utils.base64UrlEncode).toBe('function');
      expect(typeof engine.utils.assertPlainObject).toBe('function');
    });

    it('should inject TokenBuilder instance', () => {
      const factory = new EngineFactory(mockCrypto);
      const engine = factory.create();

      expect(engine.tokenBuilder).toBeDefined();
      expect(typeof engine.tokenBuilder.build).toBe('function');
    });

    it('should inject KIDFactory instance', () => {
      const factory = new EngineFactory(mockCrypto);
      const engine = factory.create();

      expect(engine.kidFactory).toBeDefined();
      expect(typeof engine.kidFactory.generate).toBe('function');
      expect(typeof engine.kidFactory.getInfo).toBe('function');
    });

    it('should create new CryptoEngine each time', () => {
      const factory = new EngineFactory(mockCrypto);
      
      const engine1 = factory.create();
      const engine2 = factory.create();

      expect(engine1).not.toBe(engine2);
    });

    it('should inject crypto module to all components', () => {
      const factory = new EngineFactory(mockCrypto);
      const engine = factory.create();

      // Verify KIDFactory received crypto
      const kid = engine.kidFactory.generate('test');
      expect(mockCrypto.randomBytes).toHaveBeenCalled();
    });
  });

  describe('getInstance (singleton)', () => {
    it('should return the same instance', () => {
      const instance1 = EngineFactory.getInstance(mockCrypto);
      const instance2 = EngineFactory.getInstance(mockCrypto);

      expect(instance1).toBe(instance2);
    });

    it('should create instance on first call', () => {
      expect(EngineFactory._instance).toBeNull();

      const instance = EngineFactory.getInstance(mockCrypto);

      expect(instance).toBeDefined();
      expect(EngineFactory._instance).toBe(instance);
    });

    it('should not create new instance on subsequent calls', () => {
      const instance1 = EngineFactory.getInstance(mockCrypto);
      const instance2 = EngineFactory.getInstance(mockCrypto);
      const instance3 = EngineFactory.getInstance(mockCrypto);

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('should initialize with provided crypto module', () => {
      const instance = EngineFactory.getInstance(mockCrypto);

      expect(instance.cryptoModule).toBe(mockCrypto);
    });
  });

  describe('dependency wiring', () => {
    it('should wire TokenBuilder with utils', () => {
      const factory = new EngineFactory(mockCrypto);
      const engine = factory.create();

      // TokenBuilder should have utils injected
      const result = engine.tokenBuilder.build({ sub: 'test' }, 'kid-123');
      
      expect(result).toHaveProperty('encodedHeader');
      expect(result).toHaveProperty('encodedPayload');
    });

    it('should wire KIDFactory with crypto', () => {
      const factory = new EngineFactory(mockCrypto);
      const engine = factory.create();

      // KIDFactory should use injected crypto
      engine.kidFactory.generate('testdomain');
      
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(4);
    });

    it('should provide all utils to TokenBuilder', () => {
      const factory = new EngineFactory(mockCrypto);
      const engine = factory.create();

      expect(engine.tokenBuilder.utils).toBeDefined();
      expect(engine.tokenBuilder.utils.assertPlainObject).toBeDefined();
      expect(engine.tokenBuilder.utils.base64UrlEncode).toBeDefined();
    });

    it('should configure CryptoEngine with all dependencies', () => {
      const factory = new EngineFactory(mockCrypto);
      const engine = factory.create();

      expect(engine.crypto).toBe(mockCrypto);
      expect(engine.config).toBeDefined();
      expect(engine.utils).toBeDefined();
      expect(engine.tokenBuilder).toBeDefined();
      expect(engine.kidFactory).toBeDefined();
    });
  });

  describe('integration with real crypto module', () => {
    it('should work with actual node crypto module', async () => {
      const crypto = await import('node:crypto');
      const factory = EngineFactory.getInstance(crypto.default);
      const engine = factory.create();

      // Generate a real key pair
      const keyPair = await engine.generateKeyPair();
      
      expect(keyPair.publicKey).toContain('BEGIN PUBLIC KEY');
      expect(keyPair.privateKey).toContain('BEGIN PRIVATE KEY');
    });

    it('should generate valid KIDs with real crypto', async () => {
      const crypto = await import('node:crypto');
      const factory = EngineFactory.getInstance(crypto.default);
      const engine = factory.create();

      const kid = engine.generateKID('testdomain');
      
      expect(kid).toMatch(/^testdomain-\d{8}-\d{6}-[A-F0-9]{8}$/);
    });

    it('should build valid tokens with real crypto', async () => {
      const crypto = await import('node:crypto');
      const factory = EngineFactory.getInstance(crypto.default);
      const engine = factory.create();

      const parts = engine.buildTokenParts({ sub: 'user123' }, 'test-kid');
      
      expect(parts.encodedHeader).toBeDefined();
      expect(parts.encodedPayload).toBeDefined();
      expect(parts.signingInput).toContain('.');
    });
  });

  describe('error handling', () => {
    it('should handle missing crypto module gracefully', () => {
      expect(() => new EngineFactory(null)).not.toThrow();
    });

    it('should create engine even with minimal crypto mock', () => {
      const minimalCrypto = {
        randomBytes: () => Buffer.alloc(4)
      };
      
      const factory = new EngineFactory(minimalCrypto);
      const engine = factory.create();
      
      expect(engine).toBeDefined();
    });
  });

  describe('factory pattern adherence', () => {
    it('should follow factory pattern conventions', () => {
      const factory = EngineFactory.getInstance(mockCrypto);
      
      expect(typeof factory.create).toBe('function');
      expect(typeof EngineFactory.getInstance).toBe('function');
    });

    it('should encapsulate instantiation logic', () => {
      const factory = new EngineFactory(mockCrypto);
      const engine = factory.create();

      // Consumer doesn't need to know about internal dependencies
      expect(engine.generateKID).toBeDefined();
      expect(engine.buildTokenParts).toBeDefined();
      expect(engine.generateKeyPair).toBeDefined();
    });

    it('should allow dependency injection at factory level', () => {
      const customCrypto = {
        randomBytes: vi.fn(() => Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]))
      };

      const factory = new EngineFactory(customCrypto);
      const engine = factory.create();

      engine.kidFactory.generate('test');
      expect(customCrypto.randomBytes).toHaveBeenCalled();
    });
  });
});
