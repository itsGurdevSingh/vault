import { readdir } from "fs/promises";

export class KeyDirectory {
    constructor(paths) {
        this.paths = paths;
    }

    /** Ensure the folder structure exists */
    async ensureDirectories(domain) {

        //check directories exist, if not thow error
        const privateDir = this.paths.privateDir(domain);
        const publicDir = this.paths.publicDir(domain);
        const metaDir = this.paths.metaKeyDir(domain);
        try {
            await readdir(privateDir);
            await readdir(publicDir);
            await readdir(metaDir);
        } catch (err) {
            // if not exist throw error (its genrator's responsibility to create directories)
            if (err.code === "ENOENT") {
                throw new Error(`Key directories do not exist for domain: ${domain}`);
            }
            throw err;
        }
    }

    /** List all private key files (*.pem → kid) */
    async listPrivateKids(domain) {
        const files = await readdir(this.paths.privateDir(domain));
        return files
            .filter(f => f.endsWith(".pem"))
            .map(f => f.replace(".pem", ""));
    }

    /** List all public key files (*.pem → kid) */
    async listPublicKids(domain) {
        const files = await readdir(this.paths.publicDir(domain));
        return files
            .filter(f => f.endsWith(".pem"))
            .map(f => f.replace(".pem", ""));
    }

    /** List metadata KIDs (useful for debugging, optional) */
    async listMetadataKids(domain) {
        const files = await readdir(this.paths.metaKeyDir(domain));
        return files
            .filter(f => f.endsWith(".json"))
            .map(f => f.replace(".json", ""));
    }
}
