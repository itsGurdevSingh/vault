import { describe, it, expect, beforeEach } from 'vitest';
import { TokenBuilder } from '../../../../src/infrastructure/cryptoEngine/tokenBuilder.js';

describe('TokenBuilder', () => {
  let tokenBuilder;
  let mockUtils;

  beforeEach(() => {
    mockUtils = {
      base64UrlEncode: (bytes) => {
        return Buffer.from(bytes).toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      },
      assertPlainObject: (v) => {
        return !!v && typeof v === 'object' && !Array.isArray(v);
      }
    };
    tokenBuilder = new TokenBuilder(mockUtils);
  });

  describe('build', () => {
    it('should build token parts successfully', () => {
      const payload = { sub: 'user123', email: 'test@example.com' };
      const kid = 'test-20260109-143022-ABCD1234';

      const result = tokenBuilder.build(payload, kid);

      expect(result).toHaveProperty('encodedHeader');
      expect(result).toHaveProperty('encodedPayload');
      expect(result).toHaveProperty('signingInput');
      expect(result).toHaveProperty('iat');
      expect(result).toHaveProperty('exp');
    });

    it('should create header with correct structure', () => {
      const payload = { sub: 'user123' };
      const kid = 'test-kid';

      const result = tokenBuilder.build(payload, kid);
      const header = JSON.parse(Buffer.from(result.encodedHeader, 'base64url').toString());

      expect(header).toEqual({
        alg: 'RS256',
        typ: 'JWT',
        kid: 'test-kid'
      });
    });

    it('should include iat in payload', () => {
      const payload = { sub: 'user123' };
      const kid = 'test-kid';
      const beforeTime = Math.floor(Date.now() / 1000);

      const result = tokenBuilder.build(payload, kid);

      expect(result.iat).toBeGreaterThanOrEqual(beforeTime);
      expect(result.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    });

    it('should add exp with default TTL of 30 days', () => {
      const payload = { sub: 'user123' };
      const kid = 'test-kid';
      const now = Math.floor(Date.now() / 1000);
      const expectedTTL = 30 * 24 * 60 * 60; // 30 days

      const result = tokenBuilder.build(payload, kid);

      expect(result.exp).toBeGreaterThanOrEqual(now + expectedTTL - 1);
      expect(result.exp).toBeLessThanOrEqual(now + expectedTTL + 1);
    });

    it('should respect custom TTL', () => {
      const payload = { sub: 'user123' };
      const kid = 'test-kid';
      const customTTL = 3600; // 1 hour
      const now = Math.floor(Date.now() / 1000);

      const result = tokenBuilder.build(payload, kid, { ttlSeconds: customTTL });

      expect(result.exp).toBeGreaterThanOrEqual(now + customTTL - 1);
      expect(result.exp).toBeLessThanOrEqual(now + customTTL + 1);
    });

    it('should not override existing exp in payload', () => {
      const customExp = Math.floor(Date.now() / 1000) + 7200;
      const payload = { sub: 'user123', exp: customExp };
      const kid = 'test-kid';

      const result = tokenBuilder.build(payload, kid);

      expect(result.exp).toBe(customExp);
    });

    it('should include additional claims', () => {
      const payload = { sub: 'user123' };
      const kid = 'test-kid';
      const additionalClaims = { aud: 'my-app', scope: 'read write' };

      const result = tokenBuilder.build(payload, kid, { additionalClaims });
      const decodedPayload = JSON.parse(Buffer.from(result.encodedPayload, 'base64url').toString());

      expect(decodedPayload.aud).toBe('my-app');
      expect(decodedPayload.scope).toBe('read write');
      expect(decodedPayload.sub).toBe('user123');
    });

    it('should create valid signingInput', () => {
      const payload = { sub: 'user123' };
      const kid = 'test-kid';

      const result = tokenBuilder.build(payload, kid);

      expect(result.signingInput).toBe(`${result.encodedHeader}.${result.encodedPayload}`);
      expect(result.signingInput.split('.')).toHaveLength(2);
    });

    it('should preserve payload properties', () => {
      const payload = { 
        sub: 'user123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write']
      };
      const kid = 'test-kid';

      const result = tokenBuilder.build(payload, kid);
      const decodedPayload = JSON.parse(Buffer.from(result.encodedPayload, 'base64url').toString());

      expect(decodedPayload.sub).toBe('user123');
      expect(decodedPayload.email).toBe('test@example.com');
      expect(decodedPayload.role).toBe('admin');
      expect(decodedPayload.permissions).toEqual(['read', 'write']);
    });
  });

  describe('validation', () => {
    it('should throw error for missing kid', () => {
      const payload = { sub: 'user123' };

      expect(() => tokenBuilder.build(payload, '')).toThrow('TokenBuilder: kid must be a non-empty string');
      expect(() => tokenBuilder.build(payload, null)).toThrow('TokenBuilder: kid must be a non-empty string');
      expect(() => tokenBuilder.build(payload, undefined)).toThrow('TokenBuilder: kid must be a non-empty string');
    });

    it('should throw error for non-string kid', () => {
      const payload = { sub: 'user123' };

      expect(() => tokenBuilder.build(payload, 123)).toThrow('TokenBuilder: kid must be a non-empty string');
      expect(() => tokenBuilder.build(payload, {})).toThrow('TokenBuilder: kid must be a non-empty string');
    });

    it('should throw error for non-object payload', () => {
      const kid = 'test-kid';

      expect(() => tokenBuilder.build('string', kid)).toThrow('TokenBuilder: payload must be a plain object');
      expect(() => tokenBuilder.build(123, kid)).toThrow('TokenBuilder: payload must be a plain object');
      expect(() => tokenBuilder.build(null, kid)).toThrow('TokenBuilder: payload must be a plain object');
    });

    it('should throw error for array payload', () => {
      const kid = 'test-kid';

      expect(() => tokenBuilder.build([1, 2, 3], kid)).toThrow('TokenBuilder: payload must be a plain object');
    });

    it('should throw error when payload exceeds size limit', () => {
      const payload = { data: 'x'.repeat(5000) }; // Large payload
      const kid = 'test-kid';
      const config = { maxPayloadBytes: 1000 };

      expect(() => tokenBuilder.build(payload, kid, {}, config))
        .toThrow(/TokenBuilder: payload exceeds limit/);
    });

    it('should not throw error when payload is within size limit', () => {
      const payload = { sub: 'user123', email: 'test@example.com' };
      const kid = 'test-kid';
      const config = { maxPayloadBytes: 4096 };

      expect(() => tokenBuilder.build(payload, kid, {}, config)).not.toThrow();
    });

    it('should use default max size of 4KB', () => {
      const payload = { data: 'x'.repeat(5000) };
      const kid = 'test-kid';

      expect(() => tokenBuilder.build(payload, kid))
        .toThrow(/payload exceeds limit/);
    });
  });

  describe('encoding', () => {
    it('should produce base64url encoded strings', () => {
      const payload = { sub: 'user123' };
      const kid = 'test-kid';

      const result = tokenBuilder.build(payload, kid);

      // Base64url should not contain +, /, or =
      expect(result.encodedHeader).not.toMatch(/[+/=]/);
      expect(result.encodedPayload).not.toMatch(/[+/=]/);
    });

    it('should be decodable', () => {
      const payload = { sub: 'user123', email: 'test@example.com' };
      const kid = 'test-kid';

      const result = tokenBuilder.build(payload, kid);

      const decodedHeader = JSON.parse(Buffer.from(result.encodedHeader, 'base64url').toString());
      const decodedPayload = JSON.parse(Buffer.from(result.encodedPayload, 'base64url').toString());

      expect(decodedHeader.kid).toBe(kid);
      expect(decodedPayload.sub).toBe('user123');
    });
  });

  describe('edge cases', () => {
    it('should handle empty payload object', () => {
      const payload = {};
      const kid = 'test-kid';

      const result = tokenBuilder.build(payload, kid);

      expect(result).toHaveProperty('encodedHeader');
      expect(result).toHaveProperty('encodedPayload');
      expect(result.iat).toBeDefined();
      expect(result.exp).toBeDefined();
    });

    it('should handle special characters in payload', () => {
      const payload = { 
        message: 'Hello "World"',
        emoji: '🚀',
        unicode: '中文'
      };
      const kid = 'test-kid';

      const result = tokenBuilder.build(payload, kid);
      const decodedPayload = JSON.parse(Buffer.from(result.encodedPayload, 'base64url').toString());

      expect(decodedPayload.message).toBe('Hello "World"');
      expect(decodedPayload.emoji).toBe('🚀');
      expect(decodedPayload.unicode).toBe('中文');
    });

    it('should handle nested objects in payload', () => {
      const payload = { 
        user: {
          id: 123,
          profile: {
            name: 'Test User',
            settings: { theme: 'dark' }
          }
        }
      };
      const kid = 'test-kid';

      const result = tokenBuilder.build(payload, kid);
      const decodedPayload = JSON.parse(Buffer.from(result.encodedPayload, 'base64url').toString());

      expect(decodedPayload.user.profile.settings.theme).toBe('dark');
    });

    it('should handle zero TTL', () => {
      const payload = { sub: 'user123' };
      const kid = 'test-kid';
      const now = Math.floor(Date.now() / 1000);

      const result = tokenBuilder.build(payload, kid, { ttlSeconds: 0 });

      expect(result.exp).toBe(now);
    });

    it('should handle very long TTL', () => {
      const payload = { sub: 'user123' };
      const kid = 'test-kid';
      const longTTL = 365 * 24 * 60 * 60; // 1 year
      const now = Math.floor(Date.now() / 1000);

      const result = tokenBuilder.build(payload, kid, { ttlSeconds: longTTL });

      expect(result.exp).toBeGreaterThanOrEqual(now + longTTL - 1);
    });
  });
});
