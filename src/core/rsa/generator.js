import crypto from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { KeyPaths } from '../../../internal/key-manager/keyPaths.js';
import { metadataManager } from '../../../internal/metadata-manager/metadataManager.js';

export class KeyPairGenerator {

    constructor(domain) {
        if (!domain || typeof domain !== 'string')
            throw new Error("KeyPairGenerator requires a domain string.");
        this.domain = domain;
    }

    static async create(domain) {
        const inst = new KeyPairGenerator(domain);
        await inst.#ensureDirectories();
        return inst;
    }

    async #ensureDirectories() {
        await mkdir(KeyPaths.privateDir(this.domain), { recursive: true });
        await mkdir(KeyPaths.publicDir(this.domain), { recursive: true });
        await mkdir(KeyPaths.metaKeyDir(this.domain), { recursive: true });
    }

    #generateKid() {
        // KID format: DOMAIN-YYYYMMDD-HHMMSS-RANDOMHEX
        const now = new Date();
        const date = now.toISOString().slice(0, 10).replace(/-/g, '');
        const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const hex = crypto.randomBytes(4).toString('hex');

        return `${this.domain}-${date}-${time}-${hex}`;
    }


    createKeyPair() {
        return new Promise((resolve, reject) => {
            crypto.generateKeyPair(
                'rsa',
                {
                    modulusLength: 4096,
                    publicKeyEncoding: { type: 'spki', format: 'pem' },
                    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
                },
                (err, publicKey, privateKey) => {
                    if (err) return reject(err);
                    resolve({ publicKey, privateKey });
                }
            );
        });
    }

    async generateRSAKeyPair() {
        const kid = this.#generateKid();
        const { publicKey, privateKey } = await this.createKeyPair();

        const privatePath = KeyPaths.privateKey(this.domain, kid);
        const publicPath = KeyPaths.publicKey(this.domain, kid);

        try {
            await writeFile(privatePath, privateKey, { mode: 0o600 });
            await writeFile(publicPath, publicKey, { mode: 0o644 });

            // write metadata files
            await metadataManager.create(this.domain, kid, new Date());

        } catch (err) {
            console.error(`Failed to save keys for KID ${kid}:`, err);
            throw err;
        }

        return kid;
    }
}
