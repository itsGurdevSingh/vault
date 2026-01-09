import { describe, it, expect, beforeEach } from 'vitest';
import { DomainNormalizer, domainNormalizer } from '../../../../src/domain/key-manager/utils/domainNormalizer.js';

describe('DomainNormalizer', () => {
    let normalizer;

    beforeEach(() => {
        normalizer = new DomainNormalizer();
    });

    describe('constructor', () => {
        it('should create an instance', () => {
            expect(normalizer).toBeInstanceOf(DomainNormalizer);
        });

        it('should have normalizeDomain method', () => {
            expect(normalizer.normalizeDomain).toBeTypeOf('function');
        });

        it('should have isValidDomain method', () => {
            expect(normalizer.isValidDomain).toBeTypeOf('function');
        });
    });

    describe('normalizeDomain', () => {
        describe('successful normalization', () => {
            it('should convert lowercase to uppercase', () => {
                const result = normalizer.normalizeDomain('examplecom');
                expect(result).toBe('EXAMPLECOM');
            });

            it('should convert mixed case to uppercase', () => {
                const result = normalizer.normalizeDomain('ExAmPlECoM');
                expect(result).toBe('EXAMPLECOM');
            });

            it('should trim leading whitespace', () => {
                const result = normalizer.normalizeDomain('  examplecom');
                expect(result).toBe('EXAMPLECOM');
            });

            it('should trim trailing whitespace', () => {
                const result = normalizer.normalizeDomain('examplecom  ');
                expect(result).toBe('EXAMPLECOM');
            });

            it('should trim both leading and trailing whitespace', () => {
                const result = normalizer.normalizeDomain('  examplecom  ');
                expect(result).toBe('EXAMPLECOM');
            });

            it('should handle domains with hyphens', () => {
                const result = normalizer.normalizeDomain('my-domain');
                expect(result).toBe('MY-DOMAIN');
            });

            it('should handle domains with underscores', () => {
                const result = normalizer.normalizeDomain('my_domain');
                expect(result).toBe('MY_DOMAIN');
            });

            it('should handle domains with numbers', () => {
                const result = normalizer.normalizeDomain('domain123');
                expect(result).toBe('DOMAIN123');
            });

            it('should preserve already uppercase domains', () => {
                const result = normalizer.normalizeDomain('EXAMPLECOM');
                expect(result).toBe('EXAMPLECOM');
            });

            it('should handle single character domain', () => {
                const result = normalizer.normalizeDomain('a');
                expect(result).toBe('A');
            });

            it('should handle long domain names', () => {
                const longDomain = 'very-long-subdomain-example';
                const result = normalizer.normalizeDomain(longDomain);
                expect(result).toBe('VERY-LONG-SUBDOMAIN-EXAMPLE');
            });

            it('should handle domains with dots (for display purposes)', () => {
                const result = normalizer.normalizeDomain('sub.domain.example.com');
                expect(result).toBe('SUB.DOMAIN.EXAMPLE.COM');
            });
        });

        describe('error handling', () => {
            it('should throw error for null domain', () => {
                expect(() => normalizer.normalizeDomain(null))
                    .toThrow('Domain must be a non-empty string');
            });

            it('should throw error for undefined domain', () => {
                expect(() => normalizer.normalizeDomain(undefined))
                    .toThrow('Domain must be a non-empty string');
            });

            it('should throw error for empty string', () => {
                expect(() => normalizer.normalizeDomain(''))
                    .toThrow('Domain must be a non-empty string');
            });

            it('should throw error for number', () => {
                expect(() => normalizer.normalizeDomain(123))
                    .toThrow('Domain must be a non-empty string');
            });

            it('should throw error for boolean', () => {
                expect(() => normalizer.normalizeDomain(true))
                    .toThrow('Domain must be a non-empty string');
            });

            it('should throw error for object', () => {
                expect(() => normalizer.normalizeDomain({ domain: 'test' }))
                    .toThrow('Domain must be a non-empty string');
            });

            it('should throw error for array', () => {
                expect(() => normalizer.normalizeDomain(['example.com']))
                    .toThrow('Domain must be a non-empty string');
            });

            it('should throw error for function', () => {
                expect(() => normalizer.normalizeDomain(() => 'example.com'))
                    .toThrow('Domain must be a non-empty string');
            });
        });

        describe('edge cases', () => {
            it('should return empty string for whitespace-only input', () => {
                const result = normalizer.normalizeDomain('   ');
                expect(result).toBe('');
            });

            it('should handle tabs and newlines', () => {
                const result = normalizer.normalizeDomain('\texamplecom\n');
                expect(result).toBe('EXAMPLECOM');
            });

            it('should not modify internal spaces (if any)', () => {
                const result = normalizer.normalizeDomain('example domain');
                expect(result).toBe('EXAMPLE DOMAIN');
            });
        });
    });

    describe('isValidDomain', () => {
        describe('valid domains', () => {
            it('should return true for lowercase alphanumeric', () => {
                expect(normalizer.isValidDomain('examplecom')).toBe(true);
            });

            it('should return true for uppercase alphanumeric', () => {
                expect(normalizer.isValidDomain('EXAMPLECOM')).toBe(true);
            });

            it('should return true for mixed case alphanumeric', () => {
                expect(normalizer.isValidDomain('ExAmPlECoM')).toBe(true);
            });

            it('should return true for domain with hyphens', () => {
                expect(normalizer.isValidDomain('my-domain-com')).toBe(true);
            });

            it('should return true for domain with underscores', () => {
                expect(normalizer.isValidDomain('my_domain_com')).toBe(true);
            });

            it('should return true for alphanumeric with numbers', () => {
                expect(normalizer.isValidDomain('domain123com')).toBe(true);
            });

            it('should return true for single character', () => {
                expect(normalizer.isValidDomain('a')).toBe(true);
            });

            it('should return true for alphanumeric with hyphen', () => {
                expect(normalizer.isValidDomain('test-123')).toBe(true);
            });

            it('should return true for alphanumeric with underscore', () => {
                expect(normalizer.isValidDomain('test_123')).toBe(true);
            });

            it('should return true for domain with leading/trailing spaces after trim', () => {
                expect(normalizer.isValidDomain('  examplecom  ')).toBe(true);
            });
        });

        describe('invalid domains', () => {
            it('should return false for null', () => {
                expect(normalizer.isValidDomain(null)).toBe(false);
            });

            it('should return false for undefined', () => {
                expect(normalizer.isValidDomain(undefined)).toBe(false);
            });

            it('should return false for empty string', () => {
                expect(normalizer.isValidDomain('')).toBe(false);
            });

            it('should return false for whitespace-only string', () => {
                expect(normalizer.isValidDomain('   ')).toBe(false);
            });

            it('should return false for number', () => {
                expect(normalizer.isValidDomain(123)).toBe(false);
            });

            it('should return false for boolean', () => {
                expect(normalizer.isValidDomain(true)).toBe(false);
            });

            it('should return false for object', () => {
                expect(normalizer.isValidDomain({ domain: 'test' })).toBe(false);
            });

            it('should return false for array', () => {
                expect(normalizer.isValidDomain(['example.com'])).toBe(false);
            });

            it('should return false for domain with dot', () => {
                expect(normalizer.isValidDomain('example.com')).toBe(false);
            });

            it('should return false for domain with special characters', () => {
                expect(normalizer.isValidDomain('example@domain')).toBe(false);
            });

            it('should return false for domain with spaces', () => {
                expect(normalizer.isValidDomain('example domain')).toBe(false);
            });

            it('should return false for domain with slash', () => {
                expect(normalizer.isValidDomain('example/domain')).toBe(false);
            });

            it('should return false for domain with backslash', () => {
                expect(normalizer.isValidDomain('example\\domain')).toBe(false);
            });

            it('should return false for domain with hash', () => {
                expect(normalizer.isValidDomain('example#domain')).toBe(false);
            });

            it('should return false for domain with percent', () => {
                expect(normalizer.isValidDomain('example%domain')).toBe(false);
            });

            it('should return false for domain with ampersand', () => {
                expect(normalizer.isValidDomain('example&domain')).toBe(false);
            });

            it('should return false for domain with asterisk', () => {
                expect(normalizer.isValidDomain('example*domain')).toBe(false);
            });

            it('should return false for domain with parentheses', () => {
                expect(normalizer.isValidDomain('example(domain)')).toBe(false);
            });

            it('should return false for domain with brackets', () => {
                expect(normalizer.isValidDomain('example[domain]')).toBe(false);
            });
        });

        describe('edge cases', () => {
            it('should return true for very long valid domain', () => {
                const longDomain = 'a'.repeat(100);
                expect(normalizer.isValidDomain(longDomain)).toBe(true);
            });

            it('should trim before validation', () => {
                expect(normalizer.isValidDomain('  valid-domain  ')).toBe(true);
            });

            it('should handle tabs in domain as invalid', () => {
                expect(normalizer.isValidDomain('example\tdomain')).toBe(false);
            });

            it('should handle newlines in domain as invalid', () => {
                expect(normalizer.isValidDomain('example\ndomain')).toBe(false);
            });
        });
    });

    describe('singleton instance', () => {
        it('should export a singleton instance', () => {
            expect(domainNormalizer).toBeInstanceOf(DomainNormalizer);
        });

        it('should have same functionality as new instance', () => {
            const result1 = domainNormalizer.normalizeDomain('testcom');
            const result2 = normalizer.normalizeDomain('testcom');
            expect(result1).toBe(result2);
        });

        it('should validate domains correctly', () => {
            const result1 = domainNormalizer.isValidDomain('testcom');
            const result2 = normalizer.isValidDomain('testcom');
            expect(result1).toBe(result2);
        });
    });

    describe('integration scenarios', () => {
        it('should normalize and validate in sequence', () => {
            const domain = '  examplecom  ';
            const isValid = normalizer.isValidDomain(domain);
            const normalized = normalizer.normalizeDomain(domain);

            expect(isValid).toBe(true);
            expect(normalized).toBe('EXAMPLECOM');
        });

        it('should handle multiple normalizations consistently', () => {
            const domains = ['testcom', 'TESTCOM', '  testcom  '];
            const results = domains.map(d => normalizer.normalizeDomain(d));

            expect(results).toEqual(['TESTCOM', 'TESTCOM', 'TESTCOM']);
        });

        it('should filter valid domains from list', () => {
            const domains = [
                'validcom',
                'also-valid',
                'invalid@domain',
                'valid_domain',
                'invalid domain',
                'with.dot'
            ];

            const validDomains = domains.filter(d => normalizer.isValidDomain(d));

            expect(validDomains).toHaveLength(3);
            expect(validDomains).toContain('validcom');
            expect(validDomains).toContain('also-valid');
            expect(validDomains).toContain('valid_domain');
        });
    });
});
