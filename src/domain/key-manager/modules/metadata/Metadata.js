export class Metadata {

    constructor(metadataStore, MetadataBuilder , isExpired) {
        this.metadataStore = metadataStore;
        this.MetadataBuilder = MetadataBuilder;
        this.isExpired = isExpired;
    }

    /* --------- CRUD-Like Public API --------- */

    async create(domain, kid, createdAt = new Date()) {
        const meta = this.MetadataBuilder.createMeta(domain, kid, createdAt);
        return await this.metadataStore.writeOrigin(domain, kid, meta);
    }

    async read(domain, kid) {
        const meta = await this.metadataStore.readOrigin(domain, kid);
        if (meta) return meta;

        // fallback: archived metadata
        return await this.metadataStore.readArchive(kid);
    }

    async addExpiry(domain, kid, expiresAt) {
        const current = await this.read(domain, kid);
        if (!current) return null;

        const updated = this.MetadataBuilder.applyExpiry(current, expiresAt);
        return await this.metadataStore.writeArchive(kid, updated);
    }

    async deleteOrigin(domain, kid) {
        return await this.metadataStore.deleteOrigin(domain, kid);
    }

    async deleteArchived(kid) {
        return await this.metadataStore.deleteArchive(kid);
    }

    /* --------- Higher-Level Domain API --------- */

    async getExpiredMetadata() {
        const archived = await this.metadataStore.readAllArchives();
        return archived.filter(meta => this.isExpired(meta));
    }
}
