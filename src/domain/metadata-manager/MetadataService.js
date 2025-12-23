import { MetaFileStore } from "./metaFileStore.js";
import { MetaBuilder } from "./metaBuilder.js";
import { isExpired } from "./utils.js";

export class MetadataService {

    constructor(metaPaths = null) {
        this.store = new MetaFileStore(metaPaths);
        this.builder = new MetaBuilder();
    }

    /* --------- CRUD-Like Public API --------- */

    async create(domain, kid, createdAt = new Date()) {
        const meta = this.builder.createMeta(domain, kid, createdAt);
        return await this.store.writeOrigin(domain, kid, meta);
    }

    async read(domain, kid) {
        const meta = await this.store.readOrigin(domain, kid);
        if (meta) return meta;

        // fallback: archived metadata
        return await this.store.readArchive(kid);
    }

    async addExpiry(domain, kid, expiresAt) {
        const current = await this.read(domain, kid);
        if (!current) return null;

        const updated = this.builder.applyExpiry(current, expiresAt);
        return await this.store.writeArchive(kid, updated);
    }

    async deleteOrigin(domain, kid) {
        return await this.store.deleteOrigin(domain, kid);
    }

    async deleteArchived(kid) {
        return await this.store.deleteArchive(kid);
    }

    /* --------- Higher-Level Domain API --------- */

    async getExpiredMetadata() {
        const archived = await this.store.readAllArchives();
        return archived.filter(meta => isExpired(meta));
    }
}
