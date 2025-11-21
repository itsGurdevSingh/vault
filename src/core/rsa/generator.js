import crypto from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const KEYS_DIR = join(process.cwd(), 'internal/keys');
const PRIVATE_DIR = join(KEYS_DIR, 'private');
const PUBLIC_DIR = join(KEYS_DIR, 'public');

async function ensureDirectories() {
    await mkdir(PRIVATE_DIR, { recursive: true });
    await mkdir(PUBLIC_DIR, { recursive: true });
}

function createKeyPair() {
    return new Promise((resolve, reject) => {
        crypto.generateKeyPair(
            'rsa',
            {
                modulusLength: 2048,
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

export async function generateRSAKeyPair(kid) {
    if (!kid || typeof kid !== 'string') {
        throw new Error('A valid kid must be a non-empty string.');
    }

    kid = kid.trim();

    await ensureDirectories();

    const { publicKey, privateKey } = await createKeyPair();

    const privatePath = join(PRIVATE_DIR, `${kid}.pem`);
    const publicPath = join(PUBLIC_DIR, `${kid}.pem`);

    try {
        await Promise.all([
            writeFile(privatePath, privateKey),
            writeFile(publicPath, publicKey)
        ]);
    } catch (err) {
        console.error(`Error saving generated keys for kid ${kid}:`, err);
        throw err;
    }

    return {
        kid,
        privateKeyPath: privatePath,
        publicKeyPath: publicPath
    };
}

export default generateRSAKeyPair;
