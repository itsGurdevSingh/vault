class DirManager {
    constructor(paths, mkdir) {
        this.paths = paths;
        this.mkdir = mkdir;
    }
    static async ensure(domain) {
        await this.mkdir(this.paths.privateDir(domain), { recursive: true });
        await this.mkdir(this.paths.publicDir(domain), { recursive: true });
        await this.mkdir(this.paths.metaKeyDir(domain), { recursive: true });
    }
}

export { DirManager };


