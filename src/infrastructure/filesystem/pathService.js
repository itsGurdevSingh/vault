import { join } from 'path';

const BASE_KEYS_DIR = join(process.cwd(), 'storage/keys');
const BASE_KEYS_META_DIR = join(process.cwd(), 'storage/metadata/keys');

export const pathService = {

    //====================== key file paths ======================//
    /**base key directory */
    base(domain) {
        return join(BASE_KEYS_DIR, domain);
    },

    /**private key directory */
    privateDir(domain) {
        return join(this.base(domain), 'private');
    },

    /**public key directory */
    publicDir(domain) {
        return join(this.base(domain), 'public');
    },

    /**full path to private key file */
    privateKey(domain, kid) {
        return join(this.privateDir(domain), `${kid}.pem`);
    },

    /**full path to public key file */
    publicKey(domain, kid) {
        return join(this.publicDir(domain), `${kid}.pem`);
    },

    //======================  origin metadata file paths ======================//

    /** origin metadata key directory */
    metaKeyDir(domain) {
        return join(BASE_KEYS_META_DIR, domain);
    },

    /** full path to origin metadata key file */
    metaKeyFile(domain, kid) {
        return join(this.metaKeyDir(domain), `${kid}.meta`);
    },

    //====================== archived metadata file paths ======================//

    /** archived metadata directory */
    metaArchivedDir() {
        return join(BASE_KEYS_META_DIR, 'archived');
    },

    /** full path to archived metadata key file */
    metaArchivedKeyFile(kid) {
        return join(this.metaArchivedDir(), `${kid}.meta`);
    }
};
