export class CryptoEngine {

    constructor({ cryptoModule, config, utils, tokenBuilder, kidFactory, hashBuilder }) {
        this.crypto = cryptoModule;
        this.config = config;
        this.utils = utils;
        this.tokenBuilder = tokenBuilder;
        this.kidFactory = kidFactory;
        this.hashBuilder = hashBuilder;
    }

    /**
     * GENERATION: Creates a new RSA Key Pair (PEM format)
     * Wraps Node's callback-style API in a Promise.
     * @returns {Promise<{ publicKey: string, privateKey: string }>}
     */
    async generateKeyPair() {
        return new Promise((resolve, reject) => {
            this.crypto.generateKeyPair(
                'rsa',
                {
                    modulusLength: this.config.MODULUS_LENGTH,
                    publicKeyEncoding: this.config.FORMATS.PUBLIC,
                    privateKeyEncoding: this.config.FORMATS.PRIVATE
                },
                (err, publicKey, privateKey) => {
                    if (err) return reject(err);
                    resolve({ publicKey, privateKey });
                }
            );
        });
    }

    /**
     * CONVERSION: Converts a Public PEM string -> JWK Object
     * Used for exposing keys to the ".well-known/jwks.json" endpoint.
     */
    async pemToJWK(pem, kid) {
        const subtle = globalThis.crypto?.subtle || this.crypto.webcrypto.subtle;

        // 1. Import the PEM as a CryptoKey object
        const keyObj = await subtle.importKey(
            'spki', // Public Key format
            this.utils.pemToArrayBuffer(pem),
            {
                name: this.config.ALG_NAME,
                hash: this.config.HASH_NAME
            },
            true, // Must be extractable to export as JWK
            ['verify']
        );

        // 2. Export that object as JSON (JWK)
        const jwk = await subtle.exportKey('jwk', keyObj);

        // 3. Add standard metadata
        return {
            ...jwk,
            kid,
            use: 'sig',
            alg: 'RS256' // Or map from CryptoConfig.ALG_NAME
        };
    }

    /**
     * IMPORT: Converts PEM string -> CryptoKey Object
     * Uses WebCrypto API (standard).
     */
    async importPrivateKey(pem) {
        // Use globalThis.crypto or injected crypto.webcrypto depending on Node version
        const subtle = globalThis.crypto?.subtle || this.crypto.webcrypto.subtle;

        return subtle.importKey(
            'pkcs8',
            this.utils.pemToArrayBuffer(pem),
            {
                name: this.config.ALG_NAME,
                hash: this.config.HASH_NAME
            },
            false,
            ['sign']
        );
    }

    /**
     * SIGNING: Signs a string using a CryptoKey
     */
    async sign(cryptoKey, inputString) {
        const subtle = globalThis.crypto?.subtle || this.crypto.webcrypto.subtle;
        const encoder = new TextEncoder();

        const buffer = await subtle.sign(
            this.config.ALG_NAME,
            cryptoKey,
            encoder.encode(inputString)
        );
        return this.utils.base64UrlEncode(new Uint8Array(buffer));
    }

    /**
     * ID GENERATION: Delegates to KIDFactory
     */
    generateKID(domain) {
        return this.kidFactory.generate(domain);
    }

    /**
     * ID PARSING: Delegates to KIDFactory
     */
    getInfo(kid) {
        return this.kidFactory.getInfo(kid);
    }

    /**
     * ASSEMBLY: Delegates token construction to TokenBuilder
     */
    buildTokenParts(payload, kid, options) {
        return this.tokenBuilder.build(payload, kid, options, {
            maxPayloadBytes: this.config.MAX_PAYLOAD_BYTES
        });
    }

    /**
     * Utility: Exposes pemToArrayBuffer
     */
    pemToArrayBuffer(pem) {
        return this.utils.pemToArrayBuffer(pem);
    }


    /**
     * HASHING: Delegates to HashBuilder
     */
    async computeHash(data) {
        return this.hashBuilder.computeHash(data);
    }
}