import {
    keyStoreAdapter,
    metadataStoreAdapter,
    garbageStoreAdapter,
    rotationPolicyAdapter,
    cryptoEngineAdapter as cryptoEngine
} from "../infrastructure/adapters/index.js";

import { rotationLockRepository } from "../infrastructure/cache/index.js";

import { GarbageManagerFactory } from "../application/services/garbageService/garbageManagerFactory.js";

export async function createGarbageServices({ snapshotBuilder, janitor, logger = console }) {
    const garbagePort = garbageStoreAdapter;
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