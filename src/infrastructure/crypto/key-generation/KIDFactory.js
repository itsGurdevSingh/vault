import crypto from 'crypto'; // Node.js crypto (or use Web Crypto API in browser – see note below)

export class KIDFactory {
    static generate(domain) {
        if (typeof domain !== 'string' || domain.length === 0) {
            throw new Error('Domain must be a non-empty string');
        }

        const now = new Date();

        // YYYYMMDD
        const date = now.toISOString().slice(0, 10).replace(/-/g, '');

        // HHMMSS (using getHours/GetMinutes/GetSeconds for reliability across environments)
        const time = 
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');

        // 8 hex chars (4 bytes → 8 hex digits)
        const hex = crypto.randomBytes(4).toString('hex').toUpperCase();

        const kidString = `${domain}-${date}-${time}-${hex}`;

        // Attach read-only methods to this specific string instance
        Object.defineProperties(kidString, {
            getDomain: {
                value: function () {
                    return this.split('-')[0];
                },
                writable: false,
                enumerable: false,
                configurable: false
            },
            getDate: {
                value: function () {
                    return this.split('-')[1];
                },
                writable: false,
                enumerable: false,
                configurable: false
            },
            getTime: {
                value: function () {
                    return this.split('-')[2];
                },
                writable: false,
                enumerable: false,
                configurable: false
            },
            getTimestamp: {
                value: function () {
                    return this.split('-')[1] + '-' + this.split('-')[2];
                },
                writable: false,
                enumerable: false,
                configurable: false
            }
        });

        return kidString;
    }
}