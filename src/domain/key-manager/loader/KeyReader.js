import { readFile } from 'fs/promises';

export class KeyReader {
    constructor(domain, cache ,paths) {
        this.domain = domain;
        this.cache = cache;
        this.paths = paths;
    }

    async privateKey(kid) {
        if (this.cache.getPrivate(kid)) return this.cache.getPrivate(kid);

        const pem = await readFile(this.paths.privateKey(this.domain, kid), 'utf8');
        this.cache.setPrivate(kid, pem);
        return pem;
    }

    async publicKey(kid) {
        if (this.cache.getPublic(kid)) return this.cache.getPublic(kid);

        const pem = await readFile(this.paths.publicKey(this.domain, kid), 'utf8');
        this.cache.setPublic(kid, pem);
        return pem;
    }
}
