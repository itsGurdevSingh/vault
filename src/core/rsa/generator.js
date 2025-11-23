import crypto from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_KEYS_DIR = join(process.cwd(), 'internal/keys');

export class KeyPairGenerator {

    constructor(domain) {
        if (!domain || typeof domain !== 'string')
            throw new Error("KeyPairGenerator requires a domain string.");

        this.domain = domain.toUpperCase().trim();
        this.domainDir = join(BASE_KEYS_DIR, this.domain);
        this.privateDir = join(this.domainDir, 'private');
        this.publicDir = join(this.domainDir, 'public');
    }

    static async create(domain) {
        const inst = new KeyPairGenerator(domain);
        await inst.#ensureDirectories();
        return inst;
    }

    async #ensureDirectories() {
        await mkdir(this.privateDir, { recursive: true });
        await mkdir(this.publicDir, { recursive: true });
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

        const privatePath = join(this.privateDir, `${kid}.pem`);
        const publicPath = join(this.publicDir, `${kid}.pem`);

        try {
            await writeFile(privatePath, privateKey, { mode: 0o600 });
            await writeFile(publicPath, publicKey, { mode: 0o644 });
        } catch (err) {
            console.error(`Failed to save keys for KID ${kid}:`, err);
            throw err;
        }

        return {
            kid,
            privateKeyPath: privatePath,
            publicKeyPath: publicPath
        };
    }
}
