import { join } from 'path';

const BASE_KEYS_DIR = join(process.cwd(), 'internal/keys');
const BASE_KEYS_META_DIR = join(process.cwd(), 'internal/metadata/keys');

export const KeyPaths = {
    base(domain) {
        return join(BASE_KEYS_DIR, domain.toUpperCase());
    },
    privateDir(domain) {
        return join(this.base(domain), 'private');
    },
    publicDir(domain) {
        return join(this.base(domain), 'public');
    },
    privateKey(domain, kid) {
        return join(this.privateDir(domain), `${kid}.pem`);
    },
    publicKey(domain, kid) {
        return join(this.publicDir(domain), `${kid}.pem`);
    },

    // metadata paths
    metaKeyDir(domain) {
        return join(BASE_KEYS_META_DIR, domain.toUpperCase());
    },
    metaKeyFile(domain, kid) {
        return join(this.metaKeyDir(domain), `${kid}.meta`);
    },

    /** archived folder is not domain specific */
    metaArchivedDir() {
        return join(BASE_KEYS_META_DIR, 'archived');
    },

    metaArchivedKeyFile(kid) {
        return join(this.metaArchivedDir(), `${kid}.meta`);
    }
};
