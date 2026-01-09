import { describe, it, expect } from 'vitest';
import { isExpired } from '../../../../src/domain/key-manager/modules/metadata/utils.js';

describe('utils - isExpired', () => {
  describe('basic expiration logic', () => {
    it('should return false if expiredAt is null', () => {
      const meta = { kid: 'test', expiredAt: null };
      expect(isExpired(meta)).toBe(false);
    });

    it('should return false if expiredAt is undefined', () => {
      const meta = { kid: 'test' };
      expect(isExpired(meta)).toBe(false);
    });

    it('should return true if expiredAt is in the past', () => {
      const pastDate = new Date(Date.now() - 10000);
      const meta = { kid: 'test', expiredAt: pastDate.toISOString() };
      expect(isExpired(meta)).toBe(true);
    });

    it('should return false if expiredAt is in the future', () => {
      const futureDate = new Date(Date.now() + 10000);
      const meta = { kid: 'test', expiredAt: futureDate.toISOString() };
      expect(isExpired(meta)).toBe(false);
    });

    it('should return true if expiredAt equals now', () => {
      const now = Date.now();
      const meta = { kid: 'test', expiredAt: new Date(now).toISOString() };
      expect(isExpired(meta, now)).toBe(true);
    });
  });

  describe('custom now parameter', () => {
    it('should use custom now timestamp', () => {
      const customNow = Date.now() + 5000;
      const meta = { kid: 'test', expiredAt: new Date(customNow - 1000).toISOString() };
      expect(isExpired(meta, customNow)).toBe(true);
    });

    it('should default to Date.now() if now not provided', () => {
      const meta = { kid: 'test', expiredAt: new Date(Date.now() - 1000).toISOString() };
      expect(isExpired(meta)).toBe(true);
    });

    it('should handle edge case where expiredAt equals custom now', () => {
      const customNow = 1000000;
      const meta = { kid: 'test', expiredAt: new Date(customNow).toISOString() };
      expect(isExpired(meta, customNow)).toBe(true);
    });
  });

  describe('date formats', () => {
    it('should handle ISO string dates', () => {
      const isoDate = '2020-01-01T00:00:00.000Z';
      const meta = { kid: 'test', expiredAt: isoDate };
      expect(isExpired(meta)).toBe(true);
    });

    it('should handle various date formats', () => {
      const dates = [
        new Date('2020-01-01').toISOString(),
        new Date('2025-12-31').toISOString(),
        new Date(0).toISOString()
      ];
      
      const now = Date.now();
      dates.forEach(date => {
        const meta = { kid: 'test', expiredAt: date };
        const expectedExpired = new Date(date).getTime() <= now;
        expect(isExpired(meta)).toBe(expectedExpired);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle epoch time (0)', () => {
      const meta = { kid: 'test', expiredAt: new Date(0).toISOString() };
      expect(isExpired(meta)).toBe(true);
    });

    it('should handle far future dates', () => {
      const meta = { kid: 'test', expiredAt: new Date('2099-12-31').toISOString() };
      expect(isExpired(meta)).toBe(false);
    });

    it('should return false for empty string expiredAt', () => {
      const meta = { kid: 'test', expiredAt: '' };
      expect(isExpired(meta)).toBe(false);
    });
  });
});
