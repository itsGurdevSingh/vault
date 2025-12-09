import { writeFile, readFile, unlink, readdir, mkdir } from "fs/promises";
import path from "path";
import { KeyPaths } from "../../infrastructure/filesystem/index.js";

export class MetaFileStore {

    /* ---------- Origin Metadata ---------- */

    async writeOrigin(domain, kid, meta) {
        const filePath = KeyPaths.metaKeyFile(domain, kid);
        await writeFile(filePath, JSON.stringify(meta, null, 2), { mode: 0o644 });
        return meta;
    }

    async readOrigin(domain, kid) {
        try {
            const filePath = KeyPaths.metaKeyFile(domain, kid);
            const data = await readFile(filePath, "utf8");
            return JSON.parse(data);
        } catch (err) {
            if (err.code === "ENOENT") return null;
            throw err;
        }
    }

    async deleteOrigin(domain, kid) {
        try {
            const filePath = KeyPaths.metaKeyFile(domain, kid);
            await unlink(filePath);
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
    }

    /* ---------- Archived Metadata ---------- */

    async writeArchive(kid, meta) {
        const archiveDir = KeyPaths.metaArchivedDir();
        await mkdir(archiveDir, { recursive: true });

        const filePath = KeyPaths.metaArchivedKeyFile(kid);
        await writeFile(filePath, JSON.stringify(meta, null, 2), { mode: 0o644 });
        return meta;
    }

    async readArchive(kid) {
        try {
            const filePath = KeyPaths.metaArchivedKeyFile(kid);
            const data = await readFile(filePath, "utf8");
            return JSON.parse(data);
        } catch (err) {
            if (err.code === "ENOENT") return null;
            throw err;
        }
    }

    async deleteArchive(kid) {
        try {
            const filePath = KeyPaths.metaArchivedKeyFile(kid);
            await unlink(filePath);
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
    }

    async readAllArchives() {
        const archiveDir = KeyPaths.metaArchivedDir();
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
