import { readFile } from 'fs/promises';

export class KeyReader {
    constructor(cache, paths) {
        this.cache = cache;
        this.paths = paths;
    }

    async privateKey(kid) {
        if (this.cache.getPrivate(kid)) return this.cache.getPrivate(kid);

        const domain = kid.getDomain();

        const pem = await readFile(this.paths.privateKey(domain, kid), 'utf8');
        this.cache.setPrivate(kid, pem);
        return pem;
    }

    async publicKey(kid) {
        if (this.cache.getPublic(kid)) return this.cache.getPublic(kid);

        const domain = kid.getDomain();

        const pem = await readFile(this.paths.publicKey(domain, kid), 'utf8');
        this.cache.setPublic(kid, pem);
        return pem;
    }
}
