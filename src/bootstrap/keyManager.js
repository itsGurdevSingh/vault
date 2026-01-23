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
import { FileSystemKeyStore } from "../infrastructure/keyStore/FileSystemKeyStore.js";
import { pathService } from "../infrastructure/filesystem/index.js";

const keyStore = new FileSystemKeyStore({ pathService });

//===============================================================================================================
//                                      Metadata Store Creation
//===============================================================================================================
import { MetadataFileStore } from '../infrastructure/metadataStore/MetadataFileStore.js';
const metadataStore = new MetadataFileStore({ metaPaths: pathService });



//===============================================================================================================
//                                      KeyManager Creation
//===============================================================================================================


export async function createKeyManager() {
    const factory = ManagerFactory.getInstance({
        keyStorePort: keyStore,
        metadataStorePort: metadataStore,
        cryptoEngine,
        lockRepo: rotationLockRepository,
        policyRepo: rotationPolicyRepository,
        Cache,
        ActiveKidCache
    });
    return await factory.create();
}
