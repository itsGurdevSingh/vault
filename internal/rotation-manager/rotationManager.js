import { defaultRotationConfig, developerRotationConfig } from "../../src/config/rotationConfig";
import { rotationPolicyRepo } from "../../src/repositories/rotationPolicy.repo";
import { keyManager } from "../key-manager/keyManager";

class RotationManager {

    // constraints for retryIntervalMs and maxRetries
    #constraints = {
        retryIntervalMs: developerRotationConfig.RETRY_INTERVAL_LIMIT,
        maxRetries: developerRotationConfig.RETRIES_LIMIT
    };

    constructor() {
        this.retryIntervalMs = defaultRotationConfig.RETRY_INTERVAL_MS;
        this.maxRetries = defaultRotationConfig.MAX_RETRIES;

        // is private config is set by admin within allowed limits
        if (!this.#isConstraintsSet()) {
            throw new Error("Developer rotation constraints are not properly set.");
        }
    }

    /** check is developer config is set is its not undefined  */
    #isConstraintsSet() {
        let isSet = true;
        const { retryIntervalMs, maxRetries } = this.#constraints;
        if (!retryIntervalMs || !maxRetries) {
            isSet = false;
        }
        // further check min and max values
        if (
            (typeof retryIntervalMs.minInterval !== 'number' && retryIntervalMs < 0) ||
            typeof retryIntervalMs.maxInterval !== 'number' ||
            (typeof maxRetries.minRetries !== 'number' && maxRetries < 0) ||
            typeof maxRetries.maxRetries !== 'number'
        ) {
            isSet = false;
        }

        return isSet;
    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new RotationManager();
        }
        return this._instance;
    }

    // ======================================================
    // PRIVATE HELPERS
    // ======================================================

    /** Run key rotation using the KeyManager */
    async #rotateDomain(domain) {
        try {

            const policy = await this.#getDomainPolicy(domain);

            if (!policy) {
                throw new Error(`No rotation policy found for domain: ${domain}`);
            }

            const { rotationInterval } = policy;

            await keyManager.rotateKeys(domain, async (session) => await this.#updatePolicy(domain, rotationInterval, session));

        } catch (err) {
            console.error(`Rotation failed for domain "${domain}":`, err);
            throw err;
        }
    }

    /** Update rotation timestamps in DB */
    async #updatePolicy(domain, rotationInterval, session = null) {
        try {

            const rotatedAt = new Date();
            const nextRotationAt = this.#calcNextRotationDate(rotatedAt, rotationInterval);

            const updationData = {
                domain,
                rotatedAt,
                nextRotationAt
            }

            await rotationPolicyRepo.updateRotationDates(updationData, session);
        } catch (err) {
            console.error(`Failed updating policy for domain "${domain}":`, err);
            throw err;
        }
    }

    /** Compute next rotation time based on days */
    #calcNextRotationDate(rotatedAt, intervalDays) {
        return new Date(rotatedAt.getTime() + intervalDays * 86400000);
    }

    /** Delay helper */
    #delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /** Get domains whose nextRotationAt <= now */
    async #getDuePolicies() {
        return rotationPolicyRepo.getDueForRotation();
    }

    /** Get domain policy */
    async #getDomainPolicy(domain) {
        return rotationPolicyRepo.findByDomain(domain);
    }

    // ======================================================
    // CORE ROTATION LOGIC
    // ======================================================

    /**
     * Rotate keys for all domains that are currently due.
     * This DOES the real work.
     */
    async #rotateDueDomains() {

        const summary = { success: 0, failed: 0 , skipped: 0};

        try {
            const duePolicies = await this.#getDuePolicies();

            if (duePolicies.length === 0) {
                console.log("No domains due for rotation.");
                return summary;
            }

            for (const policy of duePolicies) {
                const { domain, rotationInterval } = policy;

                try {
                    // Rotate keys
                    const rotationRes = await keyManager.rotateKeys(domain, async (session) => await this.#updatePolicy(domain, rotationInterval, session));

                    // If rotationRes is null, it means rotation was skipped due to lock
                    if (!rotationRes) {
                        summary.skipped++;
                        console.log(`Skipped domain: ${domain} as it is already being rotated.`);
                        continue; // skip to next domain
                    }
                    summary.success++;
                    console.log(`Rotated domain: ${domain}`);
                } catch {
                    summary.failed++;
                }
            }

            return summary;

        } catch (err) {
            console.error("Error during rotation of due domains:", err);
            return summary;
        }
    }

    /**
     * Retry rotation until all succeed or retry limit exceeded.
     */
    async #ensureSuccessfulRotation() {

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            const summary = await this.#rotateDueDomains();


            if (summary.failed === 0) {
                console.log("All due domains rotated successfully.");
                return;
            }

            if(summary.skipped > 0) {
                console.log(`${summary.skipped} domains were skipped as they are already being rotated.`);
            }

            if (attempt < this.maxRetries) {
                console.log(
                    `Retrying failed domains in ${this.retryIntervalMs / 1000}s... (attempt ${attempt}/${this.maxRetries})`
                );
                await this.#delay(this.retryIntervalMs);
            } else {
                console.error("Rotation retries exhausted. Some domains still failed.");
            }
        }
    }

    // ======================================================
    // PUBLIC API (WHAT ADMIN CALLS)
    // ======================================================

    /**
     *  Change ms for delay
     *  max interval is 1 hour (3600000 ms)
     */
    setRetryInterval(ms) {
        // Validate input
        if (typeof ms !== 'number') {
            throw new Error("retryIntervalMs must be an integer");
        }

        // Check bounds
        const { minInterval, maxInterval } = this.#constraints.retryIntervalMs;

        if (ms < minInterval || ms > maxInterval) {
            throw new Error(`retryIntervalMs must be between ${minInterval} and ${maxInterval} milliseconds`);
        }

        this.retryIntervalMs = ms;
    }
    /**
     *  Change max retries 
     *  maxRetries max is 20
    */
    setMaxRetries(count) {
        // Validate input
        if (typeof count !== 'number' || !Number.isInteger(count)) {
            throw new Error("maxRetries must be an integer");
        }

        // Check bounds
        const { minRetries, maxRetries } = this.#constraints.maxRetries;

        if (count < minRetries || count > maxRetries) {
            throw new Error(`maxRetries must be between ${minRetries} and ${maxRetries}`);
        }

        this.maxRetries = count;
    }

    /** change config both interval and maxRetries */
    configure({ retryIntervalMs, maxRetries }) {
        try {
            if (retryIntervalMs != null) this.setRetryInterval(retryIntervalMs);
            if (maxRetries != null) this.setMaxRetries(maxRetries);

        } catch (err) {
            throw err;
        }
    }


    /** Trigger rotation immediately */
    async triggerImmediateRotation() {
        try {
            console.log("Immediate rotation triggered by admin.");
            await this.#ensureSuccessfulRotation();
            console.log("Immediate rotation completed.");
        } catch (err) {
            console.error("Immediate rotation failed:", err);
            throw err;
        }
    }

    /** Trigger domain specific rotation */
    async triggerDomainRotation(domain) {
        try {
            console.log(`Immediate rotation triggered by admin for domain: ${domain}`);
            await this.#rotateDomain(domain);
            console.log(`Immediate rotation completed for domain: ${domain}`);
        } catch (err) {
            console.error(`Immediate rotation failed for domain "${domain}":`, err);
            throw err;
        }
    }

    // ======================================================
    // PUBLIC API (WHAT CRON CALLS)
    // ======================================================

    /**
     * Entry point for cron.
     */
    async runScheduledRotation() {
        try {
            console.log("Starting scheduled rotation...");
            await this.#ensureSuccessfulRotation();
            console.log("Scheduled rotation finished.");
        } catch (err) {
            console.error("Fatal error during scheduled rotation:", err);
        }
    }
}

// Export singleton
export const rotationManager = RotationManager.getInstance();
