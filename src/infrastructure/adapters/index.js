import { KeyStoreAdapter } from "./keyStoreAdapter";
import { MetadataStoreAdapter } from "./metadataStoreAdapter.js";
import { GarbageStoreAdapter } from "./GarbageStoreAdapter.js";
import { RotationPloicyAdapter } from "./rotationPolicyAdapter.js";
import { ActiveKidStoreAdapter } from "./activeKidStoreAdapter.js";
import { RotationLockAdapter } from "./rotationLockAdapter.js"
import { CryptoEngineAdapter } from "./cryptoEngineAdapter.js"
import { ActiveKidCache, rotationLockRepository } from "../cache/index.js";
import { fileSystem } from "../filesystem/index.js";
import { GarbageRepository, rotationPolicyRepository } from "../db/index.js";
import { rotationLockRepository } from "../cache/index.js";
import { cryptoEngine } from "../cryptoEngine/index.js";


const keyStoreAdapter = new KeyStoreAdapter(fileSystem.keyStore);
const metadataStoreAdapter = new MetadataStoreAdapter(fileSystem.metaStore);

const garbageRepository = new GarbageRepository();
const garbageStoreAdapter = new GarbageStoreAdapter(garbageRepository);
const rotationPolicyAdapter = new RotationPloicyAdapter(rotationPolicyRepository);

const activeKidStoreAdapter = new ActiveKidStoreAdapter({ cache: ActiveKidCache });
const rotationLockAdapter = new RotationLockAdapter({ cache: rotationLockRepository });

const cryptoEngineAdapter = new CryptoEngineAdapter(cryptoEngine);

export { 
    metadataStoreAdapter,
    keyStoreAdapter,
    garbageStoreAdapter,
    rotationPolicyAdapter,
    rotationLockAdapter,
    activeKidStoreAdapter,
    cryptoEngineAdapter
 };
