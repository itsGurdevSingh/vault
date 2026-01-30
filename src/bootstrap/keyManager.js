// Wires up all dependencies for KeyManager
import { ManagerFactory } from '../domain/key-manager/index.js';
import { cryptoEngine } from '../infrastructure/cryptoEngine/index.js';
import { rotationLockAdapter as rotationLock } from '../infrastructure/adapters/index.js';
import { rotationPolicyAdapter as rotationPolicy } from '../infrastructure/adapters/index.js';
import { Cache } from '../utils/cache.js';
import { activeKidStoreAdapter as ActiveKidCache } from '../infrastructure/adapters/index.js';


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
