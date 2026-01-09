export class Janitor {

    constructor(fileJanitor, metadataJanitor, expiredKeyReaper) {
        this.fileJanitor = fileJanitor;
        this.metadataJanitor = metadataJanitor;
        this.expiredKeyReaper = expiredKeyReaper;
    }

    //=============== expired key reaper ===============//

    async cleanDomain() {
        return this.expiredKeyReaper.cleanup();
    }

    //=============== key file janitor ===============//

    async deletePrivate(domain, kid) {
        return this.fileJanitor.deletePrivate(domain, kid);
    }

    async deletePublic(domain, kid) {
        return this.fileJanitor.deletePublic(domain, kid);
    }

    //=============== metadata janitor ===============//

    async deleteOriginMetadata(domain, kid) {
        return this.metadataJanitor.deleteOrigin(domain, kid);
    }

    async addKeyExpiry(domain, kid) {
        return this.metadataJanitor.addExpiry(domain, kid);
    }

    async deleteArchivedMetadata(kid) {
        return this.metadataJanitor.deleteArchived(kid);
    }

}
