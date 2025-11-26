// developers config for rotation manager
// this is developers select how strict rotation manager should be
// these values are used to validate admin(user of this service) input
// this file is only updated by developers(owner of system) not by admins 
export const developerRotationConfig = {
    RETRY_INTERVAL_LIMIT: { minInterval: 100000, maxInterval: 3600000 }, // min 10 minutes , max 1 hour
    RETRIES_LIMIT: { minRetries: 1, maxRetries: 20 }
};

export const defaultRotationConfig = {
    RETRY_INTERVAL_MS: 600000, // default 10 minutes
    MAX_RETRIES: 5            // default 5 retries
};