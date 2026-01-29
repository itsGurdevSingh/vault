import { KeyStoreAdapter } from "./keyStoreAdapter";
import { MetadataStoreAdapter } from "./metadataStoreAdapter.js";
import { GarbageStoreAdapter } from "./GarbageStoreAdapter.js";
import { RotationPloicyAdapter } from "./rotationPolicyAdapter.js";
import { fileSystem } from "../filesystem/index.js";
import { GarbageRepository } from "../db/repositories/garbageRepository.js";
import { rotationLockRepository } from "../cache/index.js";
import { rotationPolicyRepository } from "../db/index.js";


const keyStoreAdapter = new KeyStoreAdapter(fileSystem.keyStore);
const metadataStoreAdapter = new MetadataStoreAdapter(fileSystem.metaStore);

const garbageRepository = new GarbageRepository();
const garbageStoreAdapter = new GarbageStoreAdapter(garbageRepository);
const rotationPolicyAdapter = new RotationPloicyAdapter(rotationPolicyRepository);

export { metadataStoreAdapter };
export { keyStoreAdapter };
export { garbageStoreAdapter };
export { rotationLockRepository };
export { rotationPolicyAdapter };