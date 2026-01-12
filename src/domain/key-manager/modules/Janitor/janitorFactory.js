// sibling imports 
import { Janitor } from './janitor.js';
import { KeyFileJanitor } from './KeyFileJanitor.js';
import { MetadataJanitor } from './MetadataJanitor.js';
import { ExpiredKeyReaper } from './ExpiredKeyReaper.js';
import { KeyDeleter } from './KeyDeleter.js';


class JanitorFactory {
    // in constructor we inject all outside dependencies
    constructor({ loaderCache, builderCache, signerCache }, metadataManager, pathService) {
        this.loaderCache = loaderCache;
        this.builderCache = builderCache;
        this.signerCache = signerCache;
        this.metadataManager = metadataManager;
        this.pathService = pathService;
    }
    create() {
        // prepare injections 
        const keyDeleter = new KeyDeleter(this.pathService);
        const keyFileJanitor = new KeyFileJanitor(this.loaderCache, this.builderCache, this.signerCache, keyDeleter);
        const metadataJanitor = new MetadataJanitor(this.metadataManager);
        const expiredKeyReaper = new ExpiredKeyReaper(keyFileJanitor, metadataJanitor);

        // create main janitor instance
        return new Janitor(keyFileJanitor, metadataJanitor, expiredKeyReaper);
    }

    static getInstance(caches, metadataManager, pathService) {
        if (!JanitorFactory.instance) {
            JanitorFactory.instance = new JanitorFactory(caches, metadataManager, pathService);
        }
        return JanitorFactory.instance;
    }
}

export { JanitorFactory };
