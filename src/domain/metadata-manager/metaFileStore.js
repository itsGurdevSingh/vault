import { writeFile, readFile, unlink, readdir, mkdir } from "fs/promises";

export class MetaFileStore {

    constructor(metaPaths = null) {

        if(!metaPaths) {
             throw new Error("Meta paths must be provided"); 
        }
        this.paths = metaPaths;
    }
    
    /* ---------- Origin Metadata ---------- */

    async writeOrigin(domain, kid, meta) {
        const filePath = this.paths.metaKeyFile(domain, kid);
        await writeFile(filePath, JSON.stringify(meta, null, 2), { mode: 0o644 });
        return meta;
    }

    async readOrigin(domain, kid) {
        try {
            const filePath = this.paths.metaKeyFile(domain, kid);
            const data = await readFile(filePath, "utf8");
            return JSON.parse(data);
        } catch (err) {
            if (err.code === "ENOENT") return null;
            throw err;
        }
    }

    async deleteOrigin(domain, kid) {
        try {
            const filePath = this.paths.metaKeyFile(domain, kid);
            await unlink(filePath);
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
    }

    /* ---------- Archived Metadata ---------- */

    async writeArchive(kid, meta) {
        const archiveDir = this.paths.metaArchivedDir();
        await mkdir(archiveDir, { recursive: true });

        const filePath = this.paths.metaArchivedKeyFile(kid);
        await writeFile(filePath, JSON.stringify(meta, null, 2), { mode: 0o644 });
        return meta;
    }

    async readArchive(kid) {
        try {
            const filePath = this.paths.metaArchivedKeyFile(kid);
            const data = await readFile(filePath, "utf8");
            return JSON.parse(data);
        } catch (err) {
            if (err.code === "ENOENT") return null;
            throw err;
        }
    }

    async deleteArchive(kid) {
        try {
            const filePath = this.paths.metaArchivedKeyFile(kid);
            await unlink(filePath);
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
    }

    async readAllArchives() {
        const archiveDir = this.paths.metaArchivedDir();
        let files = [];
        try {
            files = await readdir(archiveDir);
        } catch (err) {
            if (err.code === "ENOENT") return [];
            throw err;
        }

        const metas = [];
        for (const file of files) {
            const filePath = path.join(archiveDir, file);
            const raw = await readFile(filePath, "utf8");
            metas.push(JSON.parse(raw));
        }
        return metas;
    }
}
