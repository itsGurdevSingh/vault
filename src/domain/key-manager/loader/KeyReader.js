import { pathsRepo } from "../../../infrastructure/filesystem";

export class KeyReader {
    constructor(domain, cache) {
        this.domain = domain;
        this.cache = cache;
    }

    async privateKey(kid) {
        if (this.cache.getPrivate(kid)) return this.cache.getPrivate(kid);

        const pem = await readFile(pathsRepo.privateKey(this.domain, kid), 'utf8');
        this.cache.setPrivate(kid, pem);
        return pem;
    }

    async publicKey(kid) {
        if (this.cache.getPublic(kid)) return this.cache.getPublic(kid);

        const pem = await readFile(pathsRepo.publicKey(this.domain, kid), 'utf8');
        this.cache.setPublic(kid, pem);
        return pem;
    }
}
