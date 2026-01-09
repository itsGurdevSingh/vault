
// Detection for environment (Browser vs Node)
const _hasWindowBtoa = typeof btoa === 'function' && typeof atob === 'function';

/**
 * Returns true if v is a non-null object and not an array.
 */
export function assertPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Decodes a PEM string into an ArrayBuffer
 */
export function pemToArrayBuffer(pem) {
    // Remove header/footer and whitespace
    const b64 = pem
        .replace(/-----BEGIN [\w\s]+-----/g, '')
        .replace(/-----END [\w\s]+-----/g, '')
        .replace(/\s+/g, '');

    if (_hasWindowBtoa) {
        // Browser strategy
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    } else {
        // Node strategy
        return Buffer.from(b64, 'base64').buffer;
    }
}

/**
 * Encodes Uint8Array to Base64URL string
 */
export function base64UrlEncode(bytes) {
    if (!(bytes instanceof Uint8Array)) {
        bytes = new Uint8Array(bytes);
    }

    if (_hasWindowBtoa) {
        // Browser strategy
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    } else {
        // Node strategy
        return Buffer.from(bytes)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
}