export class KeyFileJanitor {
    constructor(loaderResolver, builderResolver) {
        this.resolveLoader = loaderResolver;
        this.resolveBuilder = builderResolver;
    }

    async deletePrivate(domain, kid) {
        const loader = await this.resolveLoader(domain);
        await loader.deletePrivateKey(kid);
    }

    async deletePublic(domain, kid) {
        const loader = await this.resolveLoader(domain);
        await loader.deletePublicKey(kid);

        const builder = await this.resolveBuilder(domain);
        builder.clearKeyFromCache(kid);
    }
}
