export class KeyRegistry {

    constructor({ reader, directory }) {
        this.reader = reader;
        this.directory = directory;
    }

    async getAllPublicKids(domain) {
        return await this.directory.listPublicKids(domain);
    }

    async getAllPrivateKids(domain) {
        return await this.directory.listPrivateKids(domain);
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
