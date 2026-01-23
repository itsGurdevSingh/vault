// Wires up all dependencies for KeyManager
import { ManagerFactory } from '../domain/key-manager/index.js';
import { pathService } from '../infrastructure/filesystem/index.js';
import { cryptoEngine } from '../infrastructure/cryptoEngine/index.js';
import { rotationLockRepository } from '../infrastructure/cache/index.js';
import { rotationPolicyRepository } from '../infrastructure/db/index.js';
import { Cache } from '../utils/cache.js';
import { ActiveKidCache } from '../infrastructure/cache/index.js';


//===============================================================================================================
//                                      key store Creation
//===============================================================================================================
import { FileSystemKeyStore } from "../infrastructure/keystore/FileSystemKeyStore.js";
import { pathService } from "../infrastructure/filesystem/index.js";

const keyStore = new FileSystemKeyStore({ pathService });



//===============================================================================================================
//                                      KeyManager Creation
//===============================================================================================================


export async function createKeyManager() {
    const factory = ManagerFactory.getInstance({
        keyStorePort: keyStore,
        cryptoEngine,
        lockRepo: rotationLockRepository,
        policyRepo: rotationPolicyRepository,
        Cache,
        ActiveKidCache
    });
    return await factory.create();
}
