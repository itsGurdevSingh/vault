import { readFile } from 'fs/promises';

export class KeyReader {
    constructor(cache, paths, cryptoEngine) {
        this.cache = cache;
        this.paths = paths;
        this.cryptoEngine = cryptoEngine;
    }

    async privateKey(kid) {

        let pem = this.cache.private.get(kid);
        if (!pem) {
            const domain = this.cryptoEngine.getInfo(kid).domain;
            pem = await readFile(this.paths.privateKey(domain, kid), 'utf8');
            this.cache.setPrivate(kid, pem);
        }
        return pem;
    }

    async publicKey(kid) {
        let pem = this.cache.public.get(kid);
        if (!pem) {
            const domain = this.cryptoEngine.getInfo(kid).domain;
            pem = await readFile(this.paths.publicKey(domain, kid), 'utf8');
            this.cache.setPublic(kid, pem);
        }
        return pem;
    }
}
