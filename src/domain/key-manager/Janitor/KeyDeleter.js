import { unlink } from "fs/promises";

export class KeyDeleter {
    constructor(paths) {
        this.paths = paths;
    }

    async deletePrivateKey(domain, kid) {
        await unlink(this.paths.privateKey(domain, kid)).catch(err => {
            if (err.code !== "ENOENT") throw err;
        });
    }

    async deletePublicKey(domain, kid) {
        await unlink(this.paths.publicKey(domain, kid)).catch(err => {
            if (err.code !== "ENOENT") throw err;
        });
    }
}
