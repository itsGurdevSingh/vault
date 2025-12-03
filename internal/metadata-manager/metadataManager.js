import { writeFile, readFile, unlink } from 'fs/promises';
import fs from 'fs/promises';
import path from 'path';
import { KeyPaths } from '../key-manager/keyPaths.js';

class MetadataManager {

    async create(domain, kid, createdAt) {
        const meta = {
            kid,
            domain,
            createdAt: createdAt.toISOString(),
            expiredAt: null
        };

        const filePath = KeyPaths.metaKeyFile(domain, kid);
        await writeFile(filePath, JSON.stringify(meta, null, 2), { mode: 0o644 });
        return meta;
    }

    async read(domain, kid) {
        try {
            const filePath = KeyPaths.metaKeyFile(domain, kid);
            const raw = await readFile(filePath, 'utf8');
            return JSON.parse(raw);

        } catch (err) {
            if (err.code === 'ENOENT') {
                return this.#readArchived(kid);
            }
            throw err;
        }
    }


    /** add arvchive meta with TTL for public key deletion at expiry */
    async addExpiry(domain, kid, expiresAt) {
        const meta = await this.read(domain, kid);
        if (!meta) return null;

        meta.expiredAt = expiresAt.toISOString();

        // Write to archive
        const archivePath = KeyPaths.metaArchivedKeyFile(kid);

        // Ensure archive directory exists
        await fs.mkdir(KeyPaths.metaArchivedDir(), { recursive: true });

        await writeFile(archivePath, JSON.stringify(meta, null, 2), { mode: 0o644 });

        return meta;
    }

    /**delete origin on sucessfull key rotation */
    async deleteOrigin(domain, kid) {
        const filePath = KeyPaths.metaKeyFile(domain, kid);
        try {
            await unlink(filePath);
        } catch (err) {
            // ignore if file does not exist
            if (err.code === 'ENOENT') return;
            else throw err;
        }
    }

    /**delete archived on sucessfull expiry or rollback */
    async deleteArchived(kid) {
        const filePath = KeyPaths.metaArchivedKeyFile(kid);
        try {
            await unlink(filePath);
        } catch (err) {
            if (err.code === 'ENOENT') return;
            else throw err;
        }
    }

    async #readArchived(kid) {
        try {
            const p = KeyPaths.metaArchivedKeyFile(kid);
            const raw = await readFile(p, 'utf8');
            return JSON.parse(raw);
        } catch (err) {
            if (err.code === 'ENOENT') return null;
            throw err;
        }
    }

    async readAllArchived() {
        const dir = KeyPaths.metaArchivedDir();
        const files = await fs.readdir(dir);

        if (files.length === 0) return [];

        const metas = [];
        for (const filename of files) {
            const filePath = path.join(dir, filename);
            const raw = await readFile(filePath, 'utf8');
            metas.push(JSON.parse(raw));
        }
        return metas;
    }

    async getExpiredMetadata() {
        const archived = await this.readAllArchived();
        const now = Date.now();

        if (archived.length === 0) return [];

        return archived.filter(meta => {
            if (!meta.expiredAt) return false;
            return new Date(meta.expiredAt).getTime() <= now;
        });
    }
}

export const metadataManager = new MetadataManager();
