export class RSAKeyGenerator {
    constructor(cryptoEngine, metadataManager, keyWriter, dirManager) {
        this.cryptoEngine = cryptoEngine;
        this.metadataManager = metadataManager;
        this.keyWriter = keyWriter;
        this.dirManager = dirManager;
    }

    async generate(domain) {

        await this.dirManager.ensure(domain);

        const kid = this.cryptoEngine.generateKID(domain);

        const { publicKey, privateKey } = await this.cryptoEngine.generateKeyPair();

        await this.keyWriter.save(domain, kid, publicKey, privateKey);

        await this.metadataManager.create(domain, kid, new Date());

        return kid;
    }
}


