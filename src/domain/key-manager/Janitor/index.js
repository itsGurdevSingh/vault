import { MetadataJanitor } from "./MetadataJanitor.js";
import { KeyFileJanitor } from "./KeyFileJanitor.js";
import { ExpiredKeyReaper } from "./ExpiredKeyReaper.js";
import { Resolvers } from "../manager/resolver.js";

const metadataJanitor = new MetadataJanitor();
const keyFileJanitor = new KeyFileJanitor(Resolvers.resolveLoader, Resolvers.resolveBuilder);
const expiredKeyReaper = new ExpiredKeyReaper(keyFileJanitor, metadataJanitor);

//===============================================================================//
//                                JANITOR CLASS                                //
//===============================================================================//

class Janitor {

    //=============== expired key reaper ===============//

    async cleanDomain() {
        return expiredKeyReaper.cleanup();
    }

    //=============== key file janitor ===============//

    async deletePrivate(domain, kid) {
        return keyFileJanitor.deletePrivate(domain, kid);
    }

    async deletePublic(domain, kid) {
        return keyFileJanitor.deletePublic(domain, kid);
    }

    //=============== metadata janitor ===============//

    async deleteOriginMetadata(domain, kid) {
        return metadataJanitor.deleteOrigin(domain, kid);
    }

    async addKeyExpiry(domain, kid) {
        return metadataJanitor.addExpiry(domain, kid);
    }

    async deleteArchivedMetadata(kid) {
        return metadataJanitor.deleteArchived(kid);
    }

}

export const keyJanitor = new Janitor();
