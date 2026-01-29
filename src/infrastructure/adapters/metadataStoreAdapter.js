import { MetadataStorePort } from "../../../application/ports/MetadataStorePort.js";


export class MetadataStoreAdapter extends MetadataStorePort {
    constructor(repository) {
        super();
        this.repo = repository;
    }

    async writeOrigin(domain, kid, meta) {
        return await this.repo.writeOrigin(domain, kid, meta);
    }
    async readOrigin(domain, kid) {
        return await this.repo.readOrigin(domain, kid);
    }
    async listOriginKids(domain) {
        return await this.repo.listOriginKids(domain);
    }
    async deleteOrigin(domain, kid) {
        return await this.repo.deleteOrigin(domain, kid);
    }

    
    async writeArchived(kid, meta) {
        return await this.repo.writeArchived(kid, meta);
    }
    async readArchived(kid) {
        return await this.repo.readArchived(kid);
    }
    async readAllArchived() {
        return await this.repo.readAllArchived();
    }
    async listArchivedMeta() {
        return await this.repo.listArchivedKids();
    }
    async deleteArchived(kid) {
        return await this.repo.deleteArchived(kid);
    }


    async cleanTmpResidue(domain) {
        return await this.repo.cleanTmpResidue(domain);
    }
}