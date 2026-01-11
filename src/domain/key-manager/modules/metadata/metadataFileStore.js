export class MetadataFileStore {

    constructor(metaPaths = null, fsOps = null) {

        if (!metaPaths) {
            throw new Error("Meta paths must be provided");
        }
        if (!fsOps) {
            throw new Error("Filesystem operations must be provided");
        }
        this.paths = metaPaths;
        this.fs = fsOps;
    }

    /* ---------- Origin Metadata ---------- */

    async writeOrigin(domain, kid, meta) {
        const filePath = this.paths.metaKeyFile(domain, kid);
        await this.fs.writeFile(filePath, JSON.stringify(meta, null, 2), { mode: 0o644 });
        return meta;
    }

    async readOrigin(domain, kid) {
        try {
            const filePath = this.paths.metaKeyFile(domain, kid);
            const data = await this.fs.readFile(filePath, "utf8");
            return JSON.parse(data);
        } catch (err) {
            if (err.code === "ENOENT") return null;
            throw err;
        }
    }

    async deleteOrigin(domain, kid) {
        try {
            const filePath = this.paths.metaKeyFile(domain, kid);
            await this.fs.unlink(filePath);
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
    }

    /* ---------- Archived Metadata ---------- */

    async writeArchive(kid, meta) {
        const archiveDir = this.paths.metaArchivedDir();
        await this.fs.mkdir(archiveDir, { recursive: true });

        const filePath = this.paths.metaArchivedKeyFile(kid);
        await this.fs.writeFile(filePath, JSON.stringify(meta, null, 2), { mode: 0o644 });
        return meta;
    }

    async readArchive(kid) {
        try {
            const filePath = this.paths.metaArchivedKeyFile(kid);
            const data = await this.fs.readFile(filePath, "utf8");
            return JSON.parse(data);
        } catch (err) {
            if (err.code === "ENOENT") return null;
            throw err;
        }
    }

    async deleteArchive(kid) {
        try {
            const filePath = this.paths.metaArchivedKeyFile(kid);
            await this.fs.unlink(filePath);
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
    }

    async readAllArchives() {
        const archiveDir = this.paths.metaArchivedDir();
        let files = [];
        try {
            files = await this.fs.readdir(archiveDir);
        } catch (err) {
            if (err.code === "ENOENT") return [];
            throw err;
        }

        const metas = [];
        for (const file of files) {
            const filePath = this.fs.path.join(archiveDir, file);
            const raw = await this.fs.readFile(filePath, "utf8");
            metas.push(JSON.parse(raw));
        }
        return metas;
    }
}
