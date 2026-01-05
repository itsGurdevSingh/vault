export class KeyFileJanitor {
    /**
     * @param {KeyCache} loaderCache - The Facade for the Loader's Cache
     * @param {Cache} builderCache - The Cache used by the Builder
     * @param {KeyDeleter} filesystemHandler - The Infrastructure handler
     */
    constructor(loaderCache, builderCache, KeyDeleter) {
        this.loaderCache = loaderCache;
        this.builderCache = builderCache; // Assuming this interface has a .delete() method
        this.KeyDeleter = KeyDeleter;
    }

    async deletePrivate(domain, kid) {
        try {
            // STEP 1: Delete from Source of Truth (Filesystem) first
            // If this fails, we throw, and the Cache remains valid (correctly reflecting the file still exists).
            await this.KeyDeleter.deletePrivateKey(domain, kid);

            // STEP 2: Invalidate Read Cache (Loader)
            // Now that the file is gone, we strictly ensure memory doesn't serve it.
            await this.loaderCache.deletePrivate(kid);

        } catch (error) {
            throw new Error(`Failed to delete private key for domain ${domain} and kid ${kid}: ${error.message}`);
        }
    }

    async deletePublic(domain, kid) {
        try {
            // STEP 1: Delete from Source of Truth
            await this.KeyDeleter.deletePublicKey(domain, kid);

            // STEP 2: Invalidate Loader Cache
            await this.loaderCache.deletePublic(kid);

            // STEP 3: Invalidate Builder Cache
            // (Using 'this.builderCache' correctly)
            if (this.builderCache) {
                await this.builderCache.delete(kid);
            }

        } catch (error) {
            throw new Error(`Failed to delete public key for domain ${domain} and kid ${kid}: ${error.message}`);
        }
    }
}