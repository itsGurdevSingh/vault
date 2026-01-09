export class KeyWriter {

    constructor(paths, writeFile) {
        this.paths = paths;
        this.writeFile = writeFile;
    }

    static async save(domain, kid, publicKey, privateKey) {
        await this.writeFile(this.paths.privateKey(domain, kid), privateKey, { mode: 0o600 });
        await this.writeFile(this.paths.publicKey(domain, kid), publicKey, { mode: 0o644 });
    }
}
