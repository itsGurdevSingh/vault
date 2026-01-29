// Wires up all dependencies for KeyManager
import { ManagerFactory } from '../domain/key-manager/index.js';
import { cryptoEngine } from '../infrastructure/cryptoEngine/index.js';
import { rotationLockRepository } from '../infrastructure/cache/index.js';
import { rotationPolicyRepository } from '../infrastructure/db/index.js';
import { Cache } from '../utils/cache.js';
import { ActiveKidCache } from '../infrastructure/cache/index.js';


//===============================================================================================================
//                                      fs store 
//===============================================================================================================
import { keyStoreAdapter as keyStore } from '../infrastructure/adapters/index.js';
import { metadataStoreAdapter as metadataStore } from '../infrastructure/adapters/index.js';


//===============================================================================================================
//                                      KeyManager Creation
//===============================================================================================================


export async function createKeyManagerServices() {
    const factory = ManagerFactory.getInstance({
        keyStorePort: keyStore,
        metadataStorePort: metadataStore,
        cryptoEngine,
        lockRepo: rotationLockRepository,
        policyRepo: rotationPolicyRepository,
        Cache,
        ActiveKidCache
    });
    // The factory now returns { KeyManager, janitor, snapshotBuilder }
    return await factory.create();
}
