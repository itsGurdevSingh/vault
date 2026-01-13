// infrastructure imports
import { pathService } from "../../infrastructure/filesystem/index.js";
import { cryptoEngine } from "../../infrastructure/cryptoEngine/index.js";
import { rotationLockRepository as LockRepo } from "../../infrastructure/cache/index.js";
import { rotationPolicyRepository as policyRepo } from "../../infrastructure/db/index.js";
// outsider utils imports
import { Cache } from "../../utils/cache.js"; // in memory cache
// state imports
import { activeKidStore } from "../../state/ActiveKIDState.js";

import { ManagerFactory } from './managerFactory.js';

export { ManagerFactory }; // export for testing purposes.

const managerFactory = ManagerFactory.getInstance({ pathService, cryptoEngine, lockRepo: LockRepo, policyRepo, Cache, activeKidStore });
const manager = managerFactory.create();


export { manager };