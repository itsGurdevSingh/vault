import { KeyStoreAdapter } from "./keyStoreAdapter";
import { MetadataStoreAdapter } from "./metadataStoreAdapter.js";
import { GarbageStoreAdapter } from "./GarbageStoreAdapter.js";
import { RotationPloicyAdapter } from "./rotationPolicyAdapter.js";
import { ActiveKidStoreAdapter } from "./activeKidStoreAdapter.js";
import { ActiveKidCache } from "../cache/index.js";
import { fileSystem } from "../filesystem/index.js";
import { GarbageRepository } from "../db/repositories/garbageRepository.js";
import { rotationLockRepository } from "../cache/index.js";
import { rotationPolicyRepository } from "../db/index.js";


const keyStoreAdapter = new KeyStoreAdapter(fileSystem.keyStore);
const metadataStoreAdapter = new MetadataStoreAdapter(fileSystem.metaStore);

const garbageRepository = new GarbageRepository();
const garbageStoreAdapter = new GarbageStoreAdapter(garbageRepository);
const rotationPolicyAdapter = new RotationPloicyAdapter(rotationPolicyRepository);

const activeKidStoreAdapter = new ActiveKidStoreAdapter({ cache: ActiveKidCache });

export { 
    metadataStoreAdapter,
    keyStoreAdapter,
    garbageStoreAdapter,
    rotationLockRepository,
    rotationPolicyAdapter,
    activeKidStoreAdapter
 };
