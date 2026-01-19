// src/config/rotationConfig.js

/**
 * 🔒 DEVELOPER CONSTRAINTS (IMMUTABLE)
 * These are hard limits to protect the system stability.
 * Admins cannot configure values outside these ranges.
 */
const developerRotationConfig = {
    RETRY_INTERVAL_LIMIT: {
        minInterval: 60 * 1000,      // 1 Minute (Safety floor)
        maxInterval: 60 * 60 * 1000  // 1 Hour (Reasonable cap)
    },
    RETRIES_LIMIT: {
        minRetries: 1,               // Must try at least once
        maxRetries: 10               // Prevent infinite retry loops
    },
    // in days 
    ROTATION_INTERVAL_LIMIT: {
        minInterval: 1,    // 24 Hours
        maxInterval: 365 // 1 Year
    }
};

// Freeze to prevent accidental modification
Object.freeze(developerRotationConfig.RETRY_INTERVAL_LIMIT);
Object.freeze(developerRotationConfig.RETRIES_LIMIT);
Object.freeze(developerRotationConfig.ROTATION_INTERVAL_LIMIT);

export { developerRotationConfig };

/**
 * ⚙️ DEFAULT VALUES (MUTABLE STARTING POINT)
 * These are the values the system starts with before any Admin overrides.
 */
export const defaultRotationConfig = {
    RETRY_INTERVAL_MS: 5 * 60 * 1000, // 5 Minutes
    MAX_RETRIES: 3,                    // 3 Attempts
    ROTATION_INTERVAL_MS: 90  // 90 Days
};