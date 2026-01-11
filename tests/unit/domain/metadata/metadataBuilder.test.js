import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataBuilder } from '../../../../src/domain/key-manager/modules/metadata/metadataBuilder.js';

describe('MetadataBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new MetadataBuilder();
  });

  describe('createMeta', () => {
    it('should create metadata with all required fields', () => {
      const domain = 'example.com';
      const kid = 'test-kid-123';
      const createdAt = new Date('2024-01-01T00:00:00Z');

      const meta = builder.createMeta(domain, kid, createdAt);

      expect(meta).toEqual({
        kid: 'test-kid-123',
        domain: 'example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: null
      });
    });

    it('should set expiresAt to null initially', () => {
      const meta = builder.createMeta('domain.com', 'kid', new Date());
      expect(meta.expiresAt).toBeNull();
    });

    it('should convert createdAt to ISO string', () => {
      const createdAt = new Date('2024-06-15T12:30:45Z');
      const meta = builder.createMeta('domain.com', 'kid', createdAt);
      expect(meta.createdAt).toBe('2024-06-15T12:30:45.000Z');
    });

    it('should preserve kid value', () => {
      const kid = 'unique-kid-789';
      const meta = builder.createMeta('domain.com', kid, new Date());
      expect(meta.kid).toBe(kid);
    });

    it('should preserve domain value', () => {
      const domain = 'test.subdomain.example.com';
      const meta = builder.createMeta(domain, 'kid', new Date());
      expect(meta.domain).toBe(domain);
    });

    it('should handle various date formats', () => {
      const dates = [
        new Date('2024-01-01'),
        new Date(0),
        new Date('2099-12-31T23:59:59Z')
      ];

      dates.forEach(date => {
        const meta = builder.createMeta('domain.com', 'kid', date);
        expect(meta.createdAt).toBe(date.toISOString());
      });
    });
  });

  describe('applyExpiry', () => {
    it('should add expiresAt to existing metadata', () => {
      const original = {
        kid: 'test-kid',
        domain: 'example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: null
      };
      const expiresAt = new Date('2024-12-31T23:59:59Z');

      const updated = builder.applyExpiry(original, expiresAt);

      expect(updated.expiresAt).toBe('2024-12-31T23:59:59.000Z');
    });

    it('should preserve all original fields', () => {
      const original = {
        kid: 'preserve-kid',
        domain: 'preserve.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: null
      };
      const expiresAt = new Date('2024-12-31');

      const updated = builder.applyExpiry(original, expiresAt);

      expect(updated.kid).toBe(original.kid);
      expect(updated.domain).toBe(original.domain);
      expect(updated.createdAt).toBe(original.createdAt);
    });

    it('should not mutate original metadata', () => {
      const original = {
        kid: 'test',
        domain: 'test.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: null
      };
      const originalCopy = { ...original };

      builder.applyExpiry(original, new Date());

      expect(original).toEqual(originalCopy);
    });

    it('should convert expiresAt to ISO string', () => {
      const meta = { kid: 'test', domain: 'test.com', createdAt: '2024-01-01', expiresAt: null };
      const expiresAt = new Date('2024-06-15T12:30:45Z');

      const updated = builder.applyExpiry(meta, expiresAt);

      expect(updated.expiresAt).toBe('2024-06-15T12:30:45.000Z');
    });

    it('should overwrite existing expiresAt', () => {
      const meta = {
        kid: 'test',
        domain: 'test.com',
        createdAt: '2024-01-01',
        expiresAt: '2024-06-01T00:00:00.000Z'
      };
      const newExpiresAt = new Date('2024-12-31T23:59:59Z');

      const updated = builder.applyExpiry(meta, newExpiresAt);

      expect(updated.expiresAt).toBe('2024-12-31T23:59:59.000Z');
    });

    it('should handle epoch time', () => {
      const meta = { kid: 'test', domain: 'test.com', createdAt: '2024-01-01', expiresAt: null };
      const updated = builder.applyExpiry(meta, new Date(0));
      expect(updated.expiresAt).toBe('1970-01-01T00:00:00.000Z');
    });

    it('should preserve extra fields if present', () => {
      const meta = {
        kid: 'test',
        domain: 'test.com',
        createdAt: '2024-01-01',
        expiresAt: null,
        extraField: 'extra-value'
      };

      const updated = builder.applyExpiry(meta, new Date());

      expect(updated.extraField).toBe('extra-value');
    });
  });

  describe('integration', () => {
    it('should support create then apply expiry workflow', () => {
      const createdAt = new Date('2024-01-01');
      const expiresAt = new Date('2024-12-31');

      const created = builder.createMeta('example.com', 'kid-123', createdAt);
      const withExpiry = builder.applyExpiry(created, expiresAt);

      expect(withExpiry.kid).toBe('kid-123');
      expect(withExpiry.domain).toBe('example.com');
      expect(withExpiry.createdAt).toBe(createdAt.toISOString());
      expect(withExpiry.expiresAt).toBe(expiresAt.toISOString());
    });

    it('should handle multiple expiry updates', () => {
      const meta = builder.createMeta('domain.com', 'kid', new Date());
      const updated1 = builder.applyExpiry(meta, new Date('2024-06-01'));
      const updated2 = builder.applyExpiry(updated1, new Date('2024-12-31'));

      expect(updated2.expiresAt).toBe('2024-12-31T00:00:00.000Z');
    });
  });
});
