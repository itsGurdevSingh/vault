import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { KIDFactory } from '../../../../src/infrastructure/cryptoEngine/KIDFactory.js';

describe('KIDFactory', () => {
    let kidFactory;

    beforeEach(() => {
        kidFactory = new KIDFactory(crypto);
    });

    describe('generate', () => {
        it('should generate KID with correct format', () => {
            const domain = 'testdomain';
            const kid = kidFactory.generate(domain);

            expect(kid).toMatch(/^testdomain-\d{8}-\d{6}-[A-F0-9]{8}$/);
        });

        it('should include domain in KID', () => {
            const domain = 'mydomain';
            const kid = kidFactory.generate(domain);

            expect(kid.startsWith('mydomain-')).toBe(true);
        });

        it('should generate unique KIDs', () => {
            const domain = 'test';
            const kid1 = kidFactory.generate(domain);
            const kid2 = kidFactory.generate(domain);

            expect(kid1).not.toBe(kid2);
        });

        it('should include current date in YYYYMMDD format', () => {
            const domain = 'test';
            const kid = kidFactory.generate(domain);
            const parts = kid.split('-');

            const dateStr = parts[1];
            expect(dateStr).toMatch(/^\d{8}$/);

            // Verify it's close to today's date
            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6));
            const day = parseInt(dateStr.substring(6, 8));

            expect(year).toBeGreaterThanOrEqual(2024);
            expect(month).toBeGreaterThanOrEqual(1);
            expect(month).toBeLessThanOrEqual(12);
            expect(day).toBeGreaterThanOrEqual(1);
            expect(day).toBeLessThanOrEqual(31);
        });

        it('should include current time in HHMMSS format', () => {
            const domain = 'test';
            const kid = kidFactory.generate(domain);
            const parts = kid.split('-');

            const timeStr = parts[2];
            expect(timeStr).toMatch(/^\d{6}$/);

            const hours = parseInt(timeStr.substring(0, 2));
            const minutes = parseInt(timeStr.substring(2, 4));
            const seconds = parseInt(timeStr.substring(4, 6));

            expect(hours).toBeGreaterThanOrEqual(0);
            expect(hours).toBeLessThanOrEqual(23);
            expect(minutes).toBeGreaterThanOrEqual(0);
            expect(minutes).toBeLessThanOrEqual(59);
            expect(seconds).toBeGreaterThanOrEqual(0);
            expect(seconds).toBeLessThanOrEqual(59);
        });

        it('should include 8-character hex suffix', () => {
            const domain = 'test';
            const kid = kidFactory.generate(domain);
            const parts = kid.split('-');

            const hex = parts[3];
            expect(hex).toMatch(/^[A-F0-9]{8}$/);
            expect(hex.length).toBe(8);
        });

        it('should throw error for empty domain', () => {
            expect(() => kidFactory.generate('')).toThrow('KIDFactory: Domain must be a non-empty string');
        });

        it('should throw error for non-string domain', () => {
            expect(() => kidFactory.generate(null)).toThrow('KIDFactory: Domain must be a non-empty string');
            expect(() => kidFactory.generate(undefined)).toThrow('KIDFactory: Domain must be a non-empty string');
            expect(() => kidFactory.generate(123)).toThrow('KIDFactory: Domain must be a non-empty string');
        });

        it('should handle domains with special characters', () => {
            const domain = 'test-domain_123';
            const kid = kidFactory.generate(domain);

            expect(kid.startsWith('test-domain_123-')).toBe(true);
        });

        it('should pad time components with zeros', () => {
            const domain = 'test';
            const kid = kidFactory.generate(domain);
            const parts = kid.split('-');

            // Time should always be 6 digits
            expect(parts[2].length).toBe(6);
        });
    });

    describe('getInfo', () => {
        it('should extract metadata from valid KID', () => {
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const info = kidFactory.getInfo(kid);

            expect(info).toEqual({
                domain: 'testdomain',
                date: '20260109',
                time: '143022',
                timestamp: '20260109-143022',
                uniqueId: 'ABCD1234'
            });
        });

        it('should return null for invalid KID format', () => {
            expect(kidFactory.getInfo('invalid')).toBeNull();
            expect(kidFactory.getInfo('only-two')).toBeNull();
            expect(kidFactory.getInfo('only-three-parts')).toBeNull();
        });

        it('should return null for empty string', () => {
            expect(kidFactory.getInfo('')).toBeNull();
        });

        it('should return null for null or undefined', () => {
            expect(kidFactory.getInfo(null)).toBeNull();
            expect(kidFactory.getInfo(undefined)).toBeNull();
        });

        it('should return null for non-string input', () => {
            expect(kidFactory.getInfo(123)).toBeNull();
            expect(kidFactory.getInfo({})).toBeNull();
        });

        it('should handle KID with extra segments', () => {
            const kid = 'domain-20260109-143022-ABCD1234-extra-segments';
            const info = kidFactory.getInfo(kid);

            expect(info.domain).toBe('domain');
            expect(info.date).toBe('20260109');
            expect(info.time).toBe('143022');
            expect(info.uniqueId).toBe('ABCD1234');
        });

        it('should handle domain with hyphens', () => {
            const kid = 'test-domain-name-20260109-143022-ABCD1234';
            const info = kidFactory.getInfo(kid);

            // Only first segment is domain
            expect(info.domain).toBe('test');
        });

        it('should combine date and time into timestamp', () => {
            const kid = 'domain-20260109-143022-ABCD1234';
            const info = kidFactory.getInfo(kid);

            expect(info.timestamp).toBe('20260109-143022');
        });

        it('should work with generated KIDs', () => {
            const generated = kidFactory.generate('testdomain');
            const info = kidFactory.getInfo(generated);

            expect(info).not.toBeNull();
            expect(info.domain).toBe('testdomain');
            expect(info.date).toMatch(/^\d{8}$/);
            expect(info.time).toMatch(/^\d{6}$/);
            expect(info.uniqueId).toMatch(/^[A-F0-9]{8}$/);
        });
    });

    describe('integration with crypto module', () => {
        it('should use injected crypto for randomness', () => {
            const mockCrypto = {
                randomBytes: vi.fn(() => Buffer.from([0xAB, 0xCD, 0xEF, 0x12]))
            };

            const factory = new KIDFactory(mockCrypto);
            const kid = factory.generate('test');

            expect(mockCrypto.randomBytes).toHaveBeenCalledWith(4);
            expect(kid).toContain('ABCDEF12');
        });

        it('should generate different random suffixes', () => {
            const kids = new Set();
            for (let i = 0; i < 100; i++) {
                const kid = kidFactory.generate('test');
                const suffix = kid.split('-')[3];
                kids.add(suffix);
            }

            // With 100 generations, we should have many unique suffixes
            expect(kids.size).toBeGreaterThan(95);
        });
    });
});
