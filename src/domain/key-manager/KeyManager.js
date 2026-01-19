export class KeyManager {
    constructor({
        generator, builder, signer, janitor, // Workers
        rotationScheduler, // Orchestrators
        keyResolver,
        configManager, // The Config Object
        policyRepo,
        normalizer
    }) {
        this.generator = generator; // for initial key generation
        this.builder = builder; // for jwks building
        this.signer = signer; // for signing
        this.scheduler = rotationScheduler; // for scheduling rotations
        this.keyResolver = keyResolver; // for resolving active kids (initial setup)
        this.config = configManager; // for configuration management
        this.policyRepo = policyRepo; // for intial setup policy creation
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
    async initialSetup(domain) {
        const d = this.normalizer.normalizeDomain(domain);
        // check if policy already exists
        const existingPolicy = await this.policyRepo.findByDomain(d);
        if (existingPolicy) {
            console.log(`Rotation policy for domain ${d} already exists.`);
            return { message: "Policy already exists" };
        }
        // 1. Generate
        const newKid = await this.generator.generate(d);

        // 2. Set Active (Directly)
        await this.keyResolver.setActiveKid(d, newKid);

        // 3. Create Rotation Policy 
        const policyData = {
            domain: d,
            rotationInterval: 90,
            rotatedAt: Date.now(),
            nextRotationAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
            enabled: true,
            note: "Initial setup policy"
        };


        await this.policyRepo.createPolicy(policyData);

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