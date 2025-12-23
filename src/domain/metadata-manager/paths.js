export const Paths = {
    //======================  origin metadata file paths ======================//

    /** origin metadata key directory */
    metaKeyDir(domain) {
        return join(BASE_KEYS_META_DIR, normalizeDomain(domain));
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