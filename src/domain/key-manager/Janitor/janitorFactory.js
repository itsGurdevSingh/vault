// sibling imports 
import Janitor from './janitor.js';
import KeyFileJanitor from './KeyFileJanitor.js';
import MetadataJanitor from './MetadataJanitor.js';
import ExpiredKeyReaper from './ExpiredKeyReaper.js';
import KeyDeleter from './KeyDeleter.js';



// step of creation of janitor instances

/*we need three injections
1. file janitor
       1. which needs key deleter (sibling injection)
               1. which needs paths repo (outside injection)
       2. loader cache (outside injection)
       3. builder cache (outside injection)
2. metadata janitor
       1. metadata manager (outsider injection)
3. expired key reaper
       1. which needs file janitor (sibling injection)
       2. which needs metadata janitor (sibling injection)
*/

class JanitorFactory {
    // in constructor we inject all outside dependencies
    constructor(loaderCache, builderCache, metadataManager, pathsRepo) {
        this.loaderCache = loaderCache;
        this.builderCache = builderCache;
        this.metadataManager = metadataManager;
        this.pathsRepo = pathsRepo;
    }
    createJanitor() {
        // prepare injections 
        const keyDeleter = new KeyDeleter(this.pathsRepo);
        const keyFileJanitor = new KeyFileJanitor(this.loaderCache, this.builderCache, keyDeleter);
        const metadataJanitor = new MetadataJanitor(this.metadataManager);
        const expiredKeyReaper = new ExpiredKeyReaper(keyFileJanitor, metadataJanitor);

        // create main janitor instance
        return new Janitor(keyFileJanitor, metadataJanitor, expiredKeyReaper);
    }

    static getInstance(loaderCache, builderCache, metadataManager, pathsRepo) {
        if (!JanitorFactory.instance) {
            JanitorFactory.instance = new JanitorFactory(loaderCache, builderCache, metadataManager, pathsRepo);
        }
        return JanitorFactory.instance;
    }
}

export { JanitorFactory };
