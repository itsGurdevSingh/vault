export class RSAKeyGenerator {
    constructor(cryptoEngine, metadataManager, keyStore) {
        this.cryptoEngine = cryptoEngine;
        this.metadataManager = metadataManager;
        this.keyStore = keyStore;
    }

    async generate(domain) {

        const kid = this.cryptoEngine.generateKID(domain);

        const { publicKey, privateKey } = await this.cryptoEngine.generateKeyPair();

        await this.keyStore.saveKeyPair(domain, kid, { publicKey, privateKey });

        await this.metadataManager.create(domain, kid, new Date());

        return kid;
    }
}


