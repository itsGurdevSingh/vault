/**
 * KeyResolver - Bridge between domains and KeyLoader
 * 
 * Purpose: Abstracts the active KID retrieval and signing key loading
 * Pattern: Adapter/Facade over KeyLoader
 */

export class KeyResolver {
    constructor({ loader, ActiveKidCache }) {
        this.loader = loader;
        this.ActiveKidCache = ActiveKidCache;
    }

    async getActiveKid(domain) {
        return await this.ActiveKidCache.get(domain);
    }

    async getSigningKey(domain) {
        const activeKid = await this.getActiveKid(domain);
        const pem = await this.loader.getPrivateKey(activeKid);
        return { privateKey: pem };
    }

    async getVerificationKey(domain) {
        const activeKid = await this.getActiveKid(domain);
        return this.loader.loadPrivateKey(activeKid);
    }

    async setActiveKid(domain, kid) {
        return this.ActiveKidCache.set(domain, kid);
    }

    async clearActiveKid(domain) {
        return this.ActiveKidCache.delete(domain);
    }

}
