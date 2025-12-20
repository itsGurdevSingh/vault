import { readdir, mkdir } from "fs/promises";
import { normalizeDomain } from "../utils/normalizer.js";
import { pathsRepo } from "../../../infrastructure/filesystem/index.js";

export class KeyDirectory {
    constructor(domain) {
        if (!domain) throw new Error("KeyDirectory requires a domain.");
        this.domain = normalizeDomain(domain);
    }

    /** Ensure the folder structure exists */
    async ensureDirectories() {

        //check directories exist, if not thow error
        const privateDir = pathsRepo.privateDir(this.domain);
        const publicDir = pathsRepo.publicDir(this.domain);
        const metaDir = pathsRepo.metaKeyDir(this.domain);
        try {
            await readdir(privateDir);
            await readdir(publicDir);
            await readdir(metaDir);
        } catch (err) {
            // if not exist throw error (its genrator's responsibility to create directories)
            if (err.code === "ENOENT") {
                throw new Error(`Key directories do not exist for domain: ${this.domain}`);
            }
            throw err;
        }
    }

    /** List all private key files (*.pem → kid) */
    async listPrivateKids() {
        const files = await readdir(pathsRepo.privateDir(this.domain));
        return files
            .filter(f => f.endsWith(".pem"))
            .map(f => f.replace(".pem", ""));
    }

    /** List all public key files (*.pem → kid) */
    async listPublicKids() {
        const files = await readdir(pathsRepo.publicDir(this.domain));
        return files
            .filter(f => f.endsWith(".pem"))
            .map(f => f.replace(".pem", ""));
    }

    /** List metadata KIDs (useful for debugging, optional) */
    async listMetadataKids() {
        const files = await readdir(pathsRepo.metaKeyDir(this.domain));
        return files
            .filter(f => f.endsWith(".json"))
            .map(f => f.replace(".json", ""));
    }
}
