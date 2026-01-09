// infrastructure imports
import { pathsRepo } from "../../infrastructure/filesystem/index.js";
import { CryptoEngine } from "../../infrastructure/cryptoEngine/index.js";
import { rotationLockRepo as LockRepo } from "../../infrastructure/cache/index.js";
import { rotationPolicyRepo as policyRepo } from "../../infrastructure/db/index.js";
// outsider utils imports
import { Cache } from "../../utils/cache.js"; // in memory cache

import { ManagerFactory } from './managerFactory.js';

const managerFactory = ManagerFactory.getInstance(pathsRepo, CryptoEngine, LockRepo, policyRepo, Cache);
const manager = managerFactory.create();


export { manager };