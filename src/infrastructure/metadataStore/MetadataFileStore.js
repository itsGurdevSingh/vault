import { writeFile, readFile, unlink, readdir, mkdir } from "fs/promises";
import { MetadataStorePort } from "../../application/ports/MetadataStorePort.js";
import {
    MetadataStoreError,
    MetadataNotFoundError
} from "../errors/metadataErrors.js";

export class MetadataFileStore extends MetadataStorePort {
    constructor({ metaPaths }) {
        super();
        if (!metaPaths) {
            throw new Error("MetadataFileStore requires metaPaths");
        }
        this.paths = metaPaths;
    }

    async writeOrigin(domain, kid, meta) {
        try {
            const file = this.paths.metaKeyFile(domain, kid);
            await mkdir(this.paths.metaDir(domain), { recursive: true });
            await writeFile(file, JSON.stringify(meta, null, 2), { mode: 0o644 });
            return meta;
        } catch (err) {
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
        try {
            await mkdir(this.paths.metaArchivedDir(), { recursive: true });
            await writeFile(
                this.paths.metaArchivedKeyFile(kid),
                JSON.stringify(meta, null, 2),
                { mode: 0o644 }
            );
            return meta;
        } catch (err) {
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
}
