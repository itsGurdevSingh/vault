// Wires up all dependencies for KeyManager
import { ManagerFactory } from '../domain/key-manager/index.js';
import { Cache } from '../utils/cache.js';
import {
    cryptoEngineAdapter as cryptoEngine,
    rotationLockAdapter as rotationLock,
    rotationPolicyAdapter as rotationPolicy,
    activeKidStoreAdapter as ActiveKidCache
} from '../infrastructure/adapters/index.js';


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
        lockRepo: rotationLock,
        policyRepo: rotationPolicy,
        Cache,
        ActiveKidCache
    });
    // The factory now returns { KeyManager, janitor, snapshotBuilder }
    return await factory.create();
}
