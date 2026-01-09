// src/config/cryptoConfig.js

export const CryptoConfig = {
    // The "Strength" of the key. 
    // 4096 is very secure but slower. 2048 is standard.
    MODULUS_LENGTH: 4096,

    // The Algorithm used for Signing
    // Options: 'RSASSA-PKCS1-v1_5' (Classic) or 'PSS' (Modern)
    ALG_NAME: 'RSASSA-PKCS1-v1_5',

    // The Fingerprint Algorithm
    // Options: 'SHA-256', 'SHA-384', 'SHA-512'
    HASH_NAME: 'SHA-256',

    // Key Formats (Standard)
    FORMATS: {
        PUBLIC: { type: 'spki', format: 'pem' },
        PRIVATE: { type: 'pkcs8', format: 'pem' }
    },

    // maximum payload size for JWTs could be added here
    MAX_PAYLOAD_BYTES: 4 * 1024 // 4KB
};