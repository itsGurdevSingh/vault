export class KeyManager {
    constructor({
        loader, generator, janitor, builder, signer, // Workers
        keyRotator, rotationScheduler, // Orchestrators
        keyResolver,
        configManager, // The Config Object
        normalizer
    }) {
        this.loader = loader;
        this.generator = generator;
        this.janitor = janitor;
        this.builder = builder;
        this.signer = signer;
        this.rotator = keyRotator;
        this.scheduler = rotationScheduler;
        this.keyResolver = keyResolver;
        this.config = configManager;
        this.normalizer = normalizer;
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

    async getPublicKey(domain, kid) {
        const d = this.normalizer.normalizeDomain(domain);
        return this.loader.getPublicKey(d, kid);
    }

    // --- 2. LIFECYCLE (Admin/Cron) ---

    /**
     * Run this ONCE when onboarding a new domain.
     * It bypasses the "Rotation" logic because there is no "Old Key" to rotate.
     */
    async initialSetup(domain) {
        const d = this.normalizer.normalizeDomain(domain);
        // 1. Generate
        const newKid = await this.generator.generate(d);

        // 2. Set Active (Directly)
        await this.keyResolver.setActiveKid(d, newKid);

        // 3. Create Rotation Policy (Default)
        // (Optional: call PolicyRepo to create initial schedule)

        return { success: true, kid: newKid };
    }

    /**
     * Manual/Admin trigger to force rotation NOW.
     */
    //remaining rotation
    async rotate() {
        return this.scheduler.triggerImmediateRotation();
    }

    // domain sepecific rotation
    async rotate(domain) {
        const d = this.normalizer.normalizeDomain(domain);
        // Delegates to the Atomic Rotator
        return this.rotator.triggerDomainRotation(d);
    }

    /**
     * Cron Job Entry Point.
     */
    async scheduleRotation() {
        // Delegates to the Policy Manager
        return this.scheduler.runScheduledRotation();
    }

    // --- 3. CONFIGURATION ---
    configure(opts) {
        this.config.configure(opts);
    }
}