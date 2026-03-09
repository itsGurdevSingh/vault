export class MetadataJanitor {

    constructor(metadataManager, keyPublicTtlMs, keyGraceMs) {
        this.metadataManager = metadataManager;
        this.keyPublicTtlMs = keyPublicTtlMs;
        this.keyGraceMs = keyGraceMs;
    }

    async deleteOrigin(domain, kid) {
        return this.metadataManager.deleteOrigin(domain, kid);
    }

    async deleteArchived(kid) {
        return this.metadataManager.deleteArchived(kid);
    }

    /** add archive meta with TTL for public keys*/
    async addExpiry(domain, kid) {

        const expirationDate = new Date(Date.now() + this.keyPublicTtlMs + this.keyGraceMs);

        return await this.metadataManager.addExpiry(domain, kid, expirationDate);
    }

    async getExpiredKeys(currentDate = new Date()) {
        const expiredMetadata = await this.metadataManager.getExpiredMetadata(currentDate);
        // filter only array of {domain, kid}
        return expiredMetadata.map(meta => ({ domain: meta.domain, kid: meta.kid }));
    }
}
