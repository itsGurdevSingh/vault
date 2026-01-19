import { defaultRotationConfig, developerRotationConfig } from "../../../config/rotationConfig.js";

const RotationState = {
    // MUTABLE: These change at runtime via Admin API
    retryIntervalMs: defaultRotationConfig.RETRY_INTERVAL_MS,
    maxRetries: defaultRotationConfig.MAX_RETRIES,
    rotationIntervalMs: defaultRotationConfig.ROTATION_INTERVAL_MS,

    // IMMUTABLE: Read-only reference to the hard limits
    // The ConfigManager will use these to validate any changes
    constraints: {
        retryInterval: developerRotationConfig.RETRY_INTERVAL_LIMIT,
        maxRetries: developerRotationConfig.RETRIES_LIMIT,
        rotationInterval: developerRotationConfig.ROTATION_INTERVAL_LIMIT
    }
};

// Optional: Freeze the constraints object to strictly prevent runtime modification
Object.freeze(RotationState.constraints);

// export after freezing
export { RotationState };