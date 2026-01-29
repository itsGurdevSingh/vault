import { writeFile, readFile, unlink, readdir, mkdir } from "fs/promises";
import {
    MetadataStoreError,
    MetadataNotFoundError
} from "../../errors/metadataErrors.js";
import { Promise } from "mongoose";

export class MetadataFileStore extends MetadataStorePort {
    constructor({ metaPaths, FsUtils }) {
        if (!metaPaths) {
            throw new Error("MetadataFileStore requires metaPaths");
        }
        this.paths = metaPaths;
        this.fsUtils = FsUtils;
    }

    async writeOrigin(domain, kid, meta) {

        await this.fsUtils.ensureDir(this.paths.metaDir(domain));

        const file = this.paths.metaKeyFile(domain, kid);
        const tempFile = `${file}.tmp`;

        try {
            //write to temp file first
            await writeFile(tempFile, JSON.stringify(meta, null, 2), { mode: 0o644 });
            //rename to final file (atomic operation)
            await rename(tempFile, file);
            return meta;
        } catch (err) {

            await Promise.allSettled([
                await this.fsUtils.safeUnlink(tempFile),
                await this.fsUtils.safeUnlink(this.paths.metaKeyFile(domain, kid))
            ]);

            throw new MetadataStoreError("Failed to write origin metadata", {
                domain, kid, cause: err
            });
        }
    }

    async readOrigin(domain, kid) {
        try {
            const file = this.paths.metaKeyFile(domain, kid);
            const raw = await readFile(file, "utf8");
            return JSON.parse(raw);
        } catch (err) {
            if (err.code === "ENOENT") {
                throw new MetadataNotFoundError({ domain, kid });
            }
            throw new MetadataStoreError("Failed to read origin metadata", {
                domain, kid, cause: err
            });
        }
    }

    async deleteOrigin(domain, kid) {
        try {
            await unlink(this.paths.metaKeyFile(domain, kid));
        } catch (err) {
            if (err.code !== "ENOENT") {
                throw new MetadataStoreError("Failed to delete origin metadata", {
                    domain, kid, cause: err
                });
            }
        }
    }

    async writeArchive(kid, meta) {
        await this.fsUtils.ensureDir(this.paths.metaArchivedDir());
        const file = this.paths.metaArchivedKeyFile(kid);
        const tempFile = `${file}.tmp`;

        try {
            //write to temp file first
            await writeFile(tempFile, JSON.stringify(meta, null, 2), { mode: 0o644 });
            //rename to final file (atomic operation)
            await rename(tempFile, file);
            return meta;

        } catch (err) {

            await Promise.allSettled([
                await this.fsUtils.safeUnlink(tempFile),
                await this.fsUtils.safeUnlink(file)
            ]);

            throw new MetadataStoreError("Failed to write archived metadata", {
                kid, cause: err
            });
        }
    }

    async readArchive(kid) {
        try {
            const raw = await readFile(
                this.paths.metaArchivedKeyFile(kid),
                "utf8"
            );
            return JSON.parse(raw);
        } catch (err) {
            if (err.code === "ENOENT") {
                throw new MetadataNotFoundError({ kid });
            }
            throw new MetadataStoreError("Failed to read archived metadata", {
                kid, cause: err
            });
        }
    }

    async deleteArchive(kid) {
        try {
            await unlink(this.paths.metaArchivedKeyFile(kid));
        } catch (err) {
            if (err.code !== "ENOENT") {
                throw new MetadataStoreError("Failed to delete archived metadata", {
                    kid, cause: err
                });
            }
        }
    }

    async readAllArchives() {
        try {
            const dir = this.paths.metaArchivedDir();
            const files = await readdir(dir).catch(e =>
                e.code === "ENOENT" ? [] : Promise.reject(e)
            );

            const results = [];
            for (const f of files) {
                const raw = await readFile(
                    this.fs.path.join(dir, f),
                    "utf8"
                );
                results.push(JSON.parse(raw));
            }
            return results;
        } catch (err) {
            throw new MetadataStoreError("Failed to read archived metadata list", {
                cause: err
            });
        }
    }

    // for snapshort builds
    async listOriginKids(domain) {
        try {
            const dir = this.paths.metaDir(domain);
            const files = await readdir(dir).catch(e =>
                e.code === "ENOENT" ? [] : Promise.reject(e)
            );
            return files
                .filter(f => f.endsWith(".json"))
                .map(f => f.replace(".json", ""));
        } catch (err) {
            throw new MetadataStoreError("Failed to list origin kids", {
                domain, cause: err
            });
        }
    }

    // returns array of { kid, expiresAt }
    async listArchivedMeta() {
        try {
            const dir = this.paths.metaArchivedDir();
            const files = await readdir(dir).catch(e =>
                e.code === "ENOENT" ? [] : Promise.reject(e)
            );
            const results = [];
            for (const f of files) {
                const raw = await readFile(
                    this.paths.fs.path.join(dir, f),
                    "utf8"
                );
                const meta = JSON.parse(raw);
                results.push({ kid: f.replace(".json", ""), expiresAt: meta.expiresAt });
            }
            return results;
        } catch (err) {
            throw new MetadataStoreError("Failed to list archived metadata", {
                cause: err
            });
        }
    }

    /** tmp recedue cleanup (clean all .tmp resedue) */
    async #cleanTmpFiles(domain) {
        try {
            const metaFiles = await readdir(this.paths.metaKeyFile(domain));
            const tmpFiles = metaFiles.filter(f => f.endsWith(".tmp"));

            await Promise.all(
                tmpFiles.map(f =>
                    unlink(this.paths.tmpKey(domain, f)).catch(() => { })
                )
            );
            return true;

        } catch (err) {
            // Ignore errors during cleanup
            return false;
        }
    }

    /**clean temp from archived */
    async #cleanTmpArchivedFiles() {
        try {
            const archivedFiles = await readdir(this.paths.metaArchivedDir());
            const tmpFiles = archivedFiles.filter(f => f.endsWith(".tmp"));
            await Promise.all(
                tmpFiles.map(f =>
                    unlink(this.paths.tmpArchivedKey(f)).catch(() => { })
                )
            );
            return true;

        } catch (err) {
            // Ignore errors during cleanup
            return false;
        }
    }

    /** clean resdue from all domains*/
    async cleanTmpResidue() {
        // This method would ideally scan all domain directories.
        // For simplicity, assuming a predefined list of domains.
        const baseDir = this.paths.baseMetaDir();
        const domains = await readdir(baseDir);
        await Promise.all([
            ...domains.map(domain => this.#cleanTmpFiles(domain)),
            this.#cleanTmpArchivedFiles()
        ]);
    }
}
