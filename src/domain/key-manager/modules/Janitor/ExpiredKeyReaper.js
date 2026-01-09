export class ExpiredKeyReaper {
    constructor(fileJanitor, metadataJanitor) {
        this.fileJanitor = fileJanitor;
        this.metadataJanitor = metadataJanitor;
    }

    async cleanup() {
        const expired = await this.metadataJanitor.metadataManager.getExpiredMetadata();
        if (!expired.length) return;

        for (const { domain, kid } of expired) {
            await this.fileJanitor.deletePublic(domain, kid);
            await this.metadataJanitor.deleteArchived(kid);
        }
    }
}
