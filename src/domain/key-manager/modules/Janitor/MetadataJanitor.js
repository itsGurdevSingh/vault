import { KEY_GRACE_MS, KEY_PUBLIC_TTL_MS } from "../../../../config/keys.js";

export class MetadataJanitor {

    constructor(metadataManager) {
        this.metadataManager = metadataManager;
    }

    async deleteOrigin(domain, kid) {
        return this.metadataManager.deleteOrigin(domain, kid);
    }

    async deleteArchived(kid) {
        return this.metadataManager.deleteArchived(kid);
    }

    /** add archive meta with TTL for public keys*/
    async addExpiry(domain, kid) {

        const expirationDate = new Date(Date.now() + KEY_PUBLIC_TTL_MS + KEY_GRACE_MS);

        return await this.metadataManager.addExpiry(domain, kid, expirationDate);
    }
}
