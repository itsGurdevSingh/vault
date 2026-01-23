// sibling imports 
import { Janitor } from './janitor.js';
import { KeyJanitor } from './KeysJanitor.js';
import { MetadataJanitor } from './MetadataJanitor.js';
import { ExpiredKeyReaper } from './ExpiredKeyReaper.js';


class JanitorFactory {
    // in constructor we inject all outside dependencies
    constructor({ cache: { loaderCache, builderCache, signerCache }, metadataManager, keyStore }) {
        this.loaderCache = loaderCache;
        this.builderCache = builderCache;
        this.signerCache = signerCache;
        this.metadataManager = metadataManager;
        this.keyStore = keyStore;
    }
    create() {
        // prepare injections 
        const keyJanitor = new KeyJanitor(this.loaderCache, this.builderCache, this.signerCache, this.keyStore);
        const metadataJanitor = new MetadataJanitor(this.metadataManager);
        const expiredKeyReaper = new ExpiredKeyReaper(keyJanitor, metadataJanitor);

        // create main janitor instance
        return new Janitor(keyJanitor, metadataJanitor, expiredKeyReaper);
    }

    static getInstance({ cache, metadataManager, keyStore }) {
        if (!JanitorFactory.instance) {
            JanitorFactory.instance = new JanitorFactory({ cache, metadataManager, keyStore });
        }
        return JanitorFactory.instance;
    }
}

export { JanitorFactory };
