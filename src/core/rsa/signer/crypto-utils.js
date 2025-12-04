// Utilities for PEM handling and base64url encoding (node + browser compatible)
const _hasWindowBtoa = typeof btoa === 'function' && typeof atob === 'function';

export function pemToArrayBuffer(pem) {
    // remove header/footer and whitespace
    const b64 = pem
        .replace(/-----BEGIN [\w\s]+-----/g, '')
        .replace(/-----END [\w\s]+-----/g, '')
        .replace(/\s+/g, '');

    // node/browser compatible decode
    if (_hasWindowBtoa) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    } else {
        // Node
        return Buffer.from(b64, 'base64').buffer;
    }
}

export function base64UrlEncode(bytes) {
    // bytes: Uint8Array
    if (!(bytes instanceof Uint8Array)) {
        bytes = new Uint8Array(bytes);
    }

    if (_hasWindowBtoa) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } else {
        // Node Buffer
        return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
}
