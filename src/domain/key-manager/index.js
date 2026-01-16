// infrastructure imports
import { pathService as pathServiceExport } from "../../infrastructure/filesystem/index.js";
import { cryptoEngine } from "../../infrastructure/cryptoEngine/index.js";
import { rotationLockRepository as LockRepo } from "../../infrastructure/cache/index.js";
import { rotationPolicyRepository as policyRepo } from "../../infrastructure/db/index.js";
// outsider utils imports
import { Cache } from "../../utils/cache.js"; // in memory cache
// state imports
import { activeKidStore } from "../../state/ActiveKIDState.js";

import { ManagerFactory } from './managerFactory.js';

export { ManagerFactory }; // export for testing purposes.


const createKeyManager = async () => {
    // Note: pathService export is { pathService: actualMethods }, so we need to unwrap it
    const managerFactory = ManagerFactory.getInstance({
        pathService: pathServiceExport.pathService,
        cryptoEngine,
        lockRepo: LockRepo,
        policyRepo,
        Cache,
        activeKidStore
    });
    const manager = await managerFactory.create();
    return manager;
}

export { createKeyManager };

// for testing purposes
export const manager = createKeyManager();