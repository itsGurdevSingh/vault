export class KeyRegistry {

constructor({reader, directory}) {
        this.reader = reader;
        this.directory = directory;
    }

    async getAllPubKids() {
        return await this.directory.listPublicKids();
    }

    async getAllPvtKids() {
        return await this.directory.listPrivateKids();
    }

    async getPubKeyMap() {
        const kids = await this.getAllPubKids();
        const keys = {};

        for (const kid of kids) {
            keys[kid] = await this.reader.publicKey(kid);
        }
        return keys;
    }

    async getPvtKeyMap() {
        const kids = await this.getAllPvtKids();
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
