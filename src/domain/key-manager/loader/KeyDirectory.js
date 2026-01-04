import { readdir } from "fs/promises";

export class KeyDirectory {
    constructor(domain, paths) {
        if (!domain) throw new Error("KeyDirectory requires a domain.");
        this.domain = domain;
        this.paths = paths;
    }

    /** Ensure the folder structure exists */
    async ensureDirectories() {

        //check directories exist, if not thow error
        const privateDir = this.paths.privateDir(this.domain);
        const publicDir = this.paths.publicDir(this.domain);
        const metaDir = this.paths.metaKeyDir(this.domain);
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
        const files = await readdir(this.paths.privateDir(this.domain));
        return files
            .filter(f => f.endsWith(".pem"))
            .map(f => f.replace(".pem", ""));
    }

    /** List all public key files (*.pem → kid) */
    async listPublicKids() {
        const files = await readdir(this.paths.publicDir(this.domain));
        return files
            .filter(f => f.endsWith(".pem"))
            .map(f => f.replace(".pem", ""));
    }

    /** List metadata KIDs (useful for debugging, optional) */
    async listMetadataKids() {
        const files = await readdir(this.paths.metaKeyDir(this.domain));
        return files
            .filter(f => f.endsWith(".json"))
            .map(f => f.replace(".json", ""));
    }
}
