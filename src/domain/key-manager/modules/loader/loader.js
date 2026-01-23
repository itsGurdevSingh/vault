export class Loader {

    constructor({ reader, keyStore }) {
        this.reader = reader;
        this.keyStore = keyStore;
    }

    async getAllPublicKids(domain) {
        return await this.keyStore.listPublicKids(domain);
    }

    async getAllPrivateKids(domain) {
        return await this.keyStore.listPrivateKids(domain);
    }

    async getPublicKeyMap(domain) {
        const kids = await this.getAllPublicKids(domain);
        const keys = {}; // kid -> pem

        for (const kid of kids) {
            keys[kid] = await this.reader.publicKey(kid);
        }
        return keys;
    }

    async getPrivateKeyMap(domain) {
        const kids = await this.getAllPrivateKids(domain);
        const keys = {};
        for (const kid of kids) {
            keys[kid] = await this.reader.privateKey(kid);
        }
        return keys;
    }

    async getPublicKey(kid) {
        return await this.reader.publicKey(kid);
    }

    async getPrivateKey(kid) {
        return await this.reader.privateKey(kid);
    }

}
