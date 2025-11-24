/**
 * TTL is set to 30 days for public keys.
 * A grace period of 2 days is provided after TTL expiry.
 * 
 * signers instructions:
 * - while signing make sure we hae to sign token with less than 30days for expiration
 */

export const KEY_PUBLIC_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const KEY_GRACE_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
