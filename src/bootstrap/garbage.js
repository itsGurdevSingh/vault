import { RotationLockRepository, keyStoreAdapter, metadataStoreAdapter, garbageStoreAdapter, rotationPolicyAdapter } from "../infrastructure/adapters/index.js";
import { cryptoEngine } from "../infrastructure/cryptoEngine/index.js";
import { GarbageManagerFactory } from "../application/services/garbageService/garbageManagerFactory.js";

export async function createGarbageServices({ snapshotBuilder, janitor ,logger = console}) {
    const garbagePort = garbageStoreAdapter;
    const rotationLockRepository = RotationLockRepository;
    const stores = [keyStoreAdapter, metadataStoreAdapter];
    const factory = GarbageManagerFactory.getInstance({
        snapshotBuilder,
        garbagePort,
        rotationPolicyPort: rotationPolicyAdapter,
        cryptoEngine,
        rotationLockRepository,
        janitor,
        stores,
        logger
    });
    return factory.create();
}