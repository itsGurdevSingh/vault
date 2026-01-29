import { KeyStorePort } from "../../application/ports/KeyStorePort.js";

export class KeyStoreAdapter extends KeyStorePort {

    constructor(repository) {
        super();
        this.repo = repository;
    }

    async saveKeyPair(domain, kid, keyPair) {
        return await this.repo.saveKeyPair(domain, kid, keyPair);
    }

    async loadPrivateKey(domain, kid) {
        return await this.repo.loadPrivateKey(domain, kid);
    }
    async loadPublicKey(domain, kid) {
        return await this.repo.loadPublicKey(domain, kid);
    }

    async deletePrivateKey(domain, kid) {
        return await this.repo.deletePrivateKey(domain, kid);
    }
    async deletePublicKey(domain, kid) {
        return await this.repo.deletePublicKey(domain, kid);
    }

    async listPrivateKids(domain) {
        return await this.repo.listPrivateKids(domain);
    }
    async listPublicKids(domain) {
        return await this.repo.listPublicKids(domain);
    }

    async cleanTmpResidue(domain) {
        return await this.repo.cleanTmpResidue(domain);
    }

}