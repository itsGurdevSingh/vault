export class MetadataStorePort {
    async writeOrigin(domain, kid, meta) {
        throw new Error("Not implemented");
    }

    async readOrigin(domain, kid) {
        throw new Error("Not implemented");
    }

    async deleteOrigin(domain, kid) {
        throw new Error("Not implemented");
    }

    async writeArchive(kid, meta) {
        throw new Error("Not implemented");
    }

    async readArchive(kid) {
        throw new Error("Not implemented");
    }

    async deleteArchive(kid) {
        throw new Error("Not implemented");
    }

    async readAllArchives() {
        throw new Error("Not implemented");
    }
}
