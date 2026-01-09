export class RotationScheduler {
    
    /**
     * @param {KeyRotator} keyRotator - The "Surgeon"
     * @param {Object} policyRepo - DB Access for policies
     * @param {Object} configState - READ-ONLY access to the RotationState
     */
    constructor(keyRotator, policyRepo, configState) {
        this.rotator = keyRotator;
        this.policyRepo = policyRepo;
        this.state = configState; 
    }

    // ======================================================
    // PUBLIC API: CRON & TRIGGERS
    // ======================================================

    async runScheduledRotation() {
        console.log("Starting scheduled rotation...");
        await this._ensureSuccessfulRotation();
        console.log("Scheduled rotation finished.");
    }

    async triggerImmediateRotation() {
        console.log("Immediate rotation triggered by admin.");
        await this._ensureSuccessfulRotation();
        console.log("Immediate rotation completed.");
    }

    async triggerDomainRotation(domain) {
        console.log(`Immediate rotation triggered for: ${domain}`);
        
        const policy = await this.policyRepo.findByDomain(domain);
        if (!policy) throw new Error(`No policy found for domain: ${domain}`);

        await this._processSingleDomain(policy);
        
        console.log(`Immediate rotation completed for: ${domain}`);
    }

    // ======================================================
    // INTERNAL EXECUTION LOGIC
    // ======================================================

    async _ensureSuccessfulRotation() {
        // READ-ONLY access to config
        const { maxRetries, retryIntervalMs } = this.state;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const summary = await this._rotateDueDomains();

            if (summary.failed === 0) {
                console.log("All due domains rotated successfully.");
                return;
            }

            if (attempt < maxRetries) {
                console.log(`Retrying failed domains in ${retryIntervalMs/1000}s... (Attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
            } else {
                console.error("Rotation retries exhausted. Some domains failed.");
            }
        }
    }

    async _rotateDueDomains() {
        const summary = { success: 0, failed: 0, skipped: 0 };
        try {
            const duePolicies = await this.policyRepo.getDueForRotation();
            if (duePolicies.length === 0) return summary;

            for (const policy of duePolicies) {
                try {
                    const result = await this._processSingleDomain(policy);
                    if (result === 'SKIPPED') summary.skipped++;
                    else summary.success++;
                } catch (err) {
                    summary.failed++;
                }
            }
        } catch (err) {
            summary.failed++;
        }
        return summary;
    }

    async _processSingleDomain(policy) {
        const { domain, rotationInterval } = policy;

        // DB Update Callback
        const dbUpdateCallback = async (session) => {
            await this.policyRepo.acknowledgeSuccessfulRotation({ domain, rotationInterval }, session);
        };

        const session = await this.policyRepo.getSession();

        // Delegate Execution
        const result = await this.rotator.rotateKeys(domain, dbUpdateCallback, session);
        return result ? 'SUCCESS' : 'SKIPPED';
    }
}