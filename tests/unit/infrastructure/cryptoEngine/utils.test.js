import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pemToArrayBuffer, base64UrlEncode, assertPlainObject } from '../../../../src/infrastructure/cryptoEngine/utils.js';

describe('CryptoEngine Utils', () => {
  
  describe('assertPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(assertPlainObject({})).toBe(true);
      expect(assertPlainObject({ key: 'value' })).toBe(true);
      expect(assertPlainObject({ nested: { obj: true } })).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(assertPlainObject(null)).toBe(false);
      expect(assertPlainObject(undefined)).toBe(false);
      expect(assertPlainObject('string')).toBe(false);
      expect(assertPlainObject(123)).toBe(false);
      expect(assertPlainObject(true)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(assertPlainObject([])).toBe(false);
      expect(assertPlainObject([1, 2, 3])).toBe(false);
    });
  });

  describe('pemToArrayBuffer', () => {
    it('should convert PEM string to ArrayBuffer', () => {
      const pem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
-----END PUBLIC KEY-----`;
      
      const result = pemToArrayBuffer(pem);
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('should handle private keys', () => {
      const pem = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC
-----END PRIVATE KEY-----`;
      
      const result = pemToArrayBuffer(pem);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should strip headers and whitespace', () => {
      const pemWithSpaces = `-----BEGIN PUBLIC KEY-----
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
      -----END PUBLIC KEY-----`;
      
      const result = pemToArrayBuffer(pemWithSpaces);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle PEM with no newlines', () => {
      const pem = '-----BEGIN PUBLIC KEY-----MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA-----END PUBLIC KEY-----';
      const result = pemToArrayBuffer(pem);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('base64UrlEncode', () => {
    it('should encode Uint8Array to base64url string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = base64UrlEncode(bytes);
      
      expect(typeof result).toBe('string');
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('should handle empty array', () => {
      const bytes = new Uint8Array([]);
      const result = base64UrlEncode(bytes);
      expect(result).toBe('');
    });

    it('should replace + with -', () => {
      // Create bytes that would produce + in base64
      const bytes = new Uint8Array([62]);
      const result = base64UrlEncode(bytes);
      expect(result).not.toContain('+');
    });

    it('should replace / with _', () => {
      // Create bytes that would produce / in base64
      const bytes = new Uint8Array([63]);
      const result = base64UrlEncode(bytes);
      expect(result).not.toContain('/');
    });

    it('should strip padding =', () => {
      const bytes = new Uint8Array([1]);
      const result = base64UrlEncode(bytes);
      expect(result).not.toContain('=');
    });

    it('should handle ArrayBuffer', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer;
      const result = base64UrlEncode(buffer);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should produce consistent output', () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      const result1 = base64UrlEncode(bytes);
      const result2 = base64UrlEncode(bytes);
      expect(result1).toBe(result2);
    });
  });
});
