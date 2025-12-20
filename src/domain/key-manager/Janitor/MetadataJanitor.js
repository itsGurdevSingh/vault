import { KEY_GRACE_MS, KEY_PUBLIC_TTL_MS } from "../../../config/keys";

export class MetadataJanitor {

    async deleteOrigin(domain, kid) {
        return metadataManager.deleteOrigin(domain, kid);
    }

    async deleteArchived(kid) {
        return metadataManager.deleteArchived(kid);
    }

    /** add archive meta with TTL for public keys*/
    async addExpiry(domain, kid) {

        const expirationDate = new Date(Date.now() + KEY_PUBLIC_TTL_MS + KEY_GRACE_MS);

        await metadataManager.addExpiry(domain, kid, expirationDate);
    }
}
