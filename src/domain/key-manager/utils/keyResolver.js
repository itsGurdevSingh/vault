/**
 * KeyResolver - Bridge between domains and KeyLoader
 * 
 * Purpose: Abstracts the active KID retrieval and signing key loading
 * Pattern: Adapter/Facade over KeyLoader
 */

export class KeyResolver {
    constructor({ loader, kidStore }) {
        this.loader = loader;
        this.kidStore = kidStore;
    }

    async getActiveKid(domain) {
        return await this.kidStore.getActiveKid(domain);
    }

    // Alias for compatibility (deprecated)
    async getActiveKID(domain) {
        return this.getActiveKid(domain);
    }

    async getSigningKey(domain) {
        const activeKid = await this.getActiveKid(domain);
        return this.loader.getPvtKey(activeKid);
    }

    async getVarificationKey(domain) {
        const activeKid = await this.getActiveKid(domain);
        return this.loader.loadPrivateKey(activeKid);
    }

    async setActiveKid(domain, kid) {
        return this.kidStore.setActiveKid(domain, kid);
    }

}
