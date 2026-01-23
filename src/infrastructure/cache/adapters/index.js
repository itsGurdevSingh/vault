import { rotationPolicyRepository } from "../../db/repositories/rotationPolicyRepository.js";
import { Cache } from "../../../utils/cache.js";
import RedisBoundedStore from "../primitives/redisBoundedStore.js";
import redis from "../client/redisClient.js";

import { RedisBoundedLockManager } from "../primitives/redisBoundedLockManager.js";
import { RotationLockRepository } from "./rotationLockRepository.js";
import { ActiveKidCache as ActiveKidCacheClass } from "./activeKidCache.js";

//===============================================================================================================
//                                      ActiveKidCache Adapter
//===============================================================================================================

// intialize ActiveKidCache
const REDIS_LIMIT = 1000;
const inMemoryCache = new Cache({ limit: 1000 });
const distributedCache = new RedisBoundedStore({ prefix: 'active_kid:', limit: REDIS_LIMIT, redisClient: redis });

export const ActiveKidCache = new ActiveKidCacheClass({ inMemoryCache, distributedCache, repository: rotationPolicyRepository, ttlSeconds: 2 * 3600 });



//===============================================================================================================
//                                      RotationLockRepository Adapter
//===============================================================================================================


// intialize RotationLockRepository
const lockManager = new RedisBoundedLockManager({
    prefix: "rotation_lock:",
    limit: 100, // max 100 concurrent locks
    redisClient: redis
});

export const rotationLockRepository = new RotationLockRepository({ lockManager });