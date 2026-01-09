export class KIDFactory {

    constructor(cryptoModule) {
        this.crypto = cryptoModule;
    }

    /**
     * Creates a unique Key ID (KID)
     * Format: {domain}-{YYYYMMDD}-{HHMMSS}-{HEX}
     */
    generate(domain) {
        if (typeof domain !== 'string' || domain.length === 0) {
            throw new Error('KIDFactory: Domain must be a non-empty string');
        }

        const now = new Date();

        // YYYYMMDD
        const date = now.toISOString().slice(0, 10).replace(/-/g, '');

        // HHMMSS
        const time =
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');

        // Randomness (4 bytes = 8 hex chars)
        const hex = this.crypto.randomBytes(4).toString('hex').toUpperCase();

        return `${domain}-${date}-${time}-${hex}`;
    }

    /**
     * Extracts metadata from a KID string.
     * Returns null if format is invalid.
     */
    getInfo(kid) {
        if (!kid || typeof kid !== 'string') return null;

        const parts = kid.split('-');
        if (parts.length < 4) return null;

        return {
            domain: parts[0],
            date: parts[1],
            time: parts[2],
            timestamp: `${parts[1]}-${parts[2]}`,
            uniqueId: parts[3]
        };
    }
}