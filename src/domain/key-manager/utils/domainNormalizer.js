/**
 * Domain Normalizer - Ensures consistent domain name formatting
 * 
 * Purpose: Normalize domain names to uppercase and trim whitespace
 * Pattern: Utility/Helper function
 */

class DomainNormalizer {
    /**
     * Normalize a domain name to uppercase and trim whitespace
     * @param {string} domain - The domain name to normalize
     * @returns {string} The normalized domain name
     * @throws {Error} If domain is not a valid string
     */
    normalizeDomain(domain) {
        if (!domain || typeof domain !== 'string') {
            throw new Error('Domain must be a non-empty string');
        }

        return domain.toUpperCase().trim();
    }

    /**
     * Validate if a domain name is valid
     * @param {string} domain - The domain name to validate
     * @returns {boolean} True if valid, false otherwise
     */
    isValidDomain(domain) {
        if (!domain || typeof domain !== 'string') {
            return false;
        }

        const normalized = domain.trim();

        // Basic validation: alphanumeric, hyphens, underscores
        const domainRegex = /^[A-Z0-9_-]+$/i;
        return domainRegex.test(normalized) && normalized.length > 0;
    }
}

// Export singleton instance
export const domainNormalizer = new DomainNormalizer();

// Also export the class for testing
export { DomainNormalizer };
