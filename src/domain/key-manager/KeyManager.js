export class KeyManager {
    constructor({
        builder, signer, janitor, // Workers
        keyRotator, // Orchestrators
        domainInitializer, // Domain Setup
        normalizer
    }) {
        this.builder = builder; // for jwks building
        this.signer = signer; // for signing
        this.rotator = keyRotator; // for scheduling rotations
        this.janitor = janitor; // for cleaning up expired keys
        this.domainInitializer = domainInitializer; // for initial domain setup
        this.normalizer = normalizer; // for domain normalization
    }

    // --- 1. CORE USAGE ---
    async sign(domain, payload, opts) {
        const d = this.normalizer.normalizeDomain(domain);
        return this.signer.sign(d, payload, opts);
    }

    async getJwks(domain) {
        const d = this.normalizer.normalizeDomain(domain);
        return this.builder.getJwks(d);
    }

    // --- 2. LIFECYCLE (Admin/Cron) ---

    /**
     * Run this ONCE when onboarding a new domain.
     * It bypasses the "Rotation" logic because there is no "Old Key" to rotate.
     */
    async initialSetupDomain(domain, policyOpts = {}) {
        const d = this.normalizer.normalizeDomain(domain);
        return this.domainInitializer.setupDomain({ domain: d, policyOpts });
    }

    /**
     * Triggers key rotation for a specific domain.(the sergeon)
     */
    async rotateKeys(domain, updateRotationDatesCallback, session) {
        const d = this.normalizer.normalizeDomain(domain);
        return await this.rotator.rotateKeys(d, updateRotationDatesCallback, session) ;
    }


    async cleanupExpiredKeys() {
        return this.janitor.runCleanup();
    }
}