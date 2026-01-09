export class KeyRegistry {

constructor({reader, directory}) {
        this.reader = reader;
        this.directory = directory;
    }

    async getAllPubKids(domain) {
        return await this.directory.listPublicKids(domain);
    }

    async getAllPvtKids(domain) {
        return await this.directory.listPrivateKids(domain);
    }

    async getPubKeyMap(domain) {
        const kids = await this.getAllPubKids(domain);
        const keys = {}; // kid -> pem

        for (const kid of kids) {
            keys[kid] = await this.reader.publicKey(kid);
        }
        return keys;
    }

    async getPvtKeyMap(domain) {
        const kids = await this.getAllPvtKids(domain);
        const keys = {};
        for (const kid of kids) {
            keys[kid] = await this.reader.privateKey(kid);
        }
        return keys;
    }

    async getPubKey(kid) {
        return await this.reader.publicKey(kid);
    }

    async getPvtKey(kid) {
        return await this.reader.privateKey(kid);
    }
    
}
