import { pathsRepo } from "../../../infrastructure/filesystem";

export class KeyDeleter {
    constructor(domain, cache) {
        this.domain = domain;
        this.cache = cache;
    }

    async deletePrivate(kid) {
        await unlink(pathsRepo.privateKey(this.domain, kid)).catch(err => {
            if (err.code !== "ENOENT") throw err;
        });
        this.cache.deletePrivate(kid);
    }

    async deletePublic(kid) {
        await unlink(pathsRepo.publicKey(this.domain, kid)).catch(err => {
            if (err.code !== "ENOENT") throw err;
        });
        this.cache.deletePublic(kid);
    }
}
