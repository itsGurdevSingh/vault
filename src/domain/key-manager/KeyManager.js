export class KeyManager {
    constructor({
        builder, signer, janitor, // Workers
        rotationScheduler, // Orchestrators
        configManager, // The Config Object
        domainInitializer, // Domain Setup
        normalizer
    }) {
        this.builder = builder; // for jwks building
        this.signer = signer; // for signing
        this.scheduler = rotationScheduler; // for scheduling rotations
        this.config = configManager; // for configuration management
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
     * Manual/Admin trigger to force rotation NOW.
     */
    //remaining rotation
    async rotate() {
        return this.scheduler.triggerImmediateRotation();
    }

    // domain sepecific rotation
    async rotateDomain(domain) {
        const d = this.normalizer.normalizeDomain(domain);
        // Delegates to the Scheduler
        return this.scheduler.triggerDomainRotation(d);
    }

    /**
     * Cron Job Entry Point.
     */
    async scheduleRotation() {
        // Delegates to the Policy Manager
        return this.scheduler.runScheduledRotation();
    }

    async cleanupExpiredKeys() {
        return this.janitor.runCleanup();
    }

    // --- 3. CONFIGURATION ---
    configure(opts) {
        this.config.configure(opts);
    }
}