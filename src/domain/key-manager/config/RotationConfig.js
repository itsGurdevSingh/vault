class RotationConfig {
    /**
     * @param {Object} state - The shared RotationState object (Mutable)
     */
    constructor({ state }) {
        this.state = state;

        // Validate initial state on startup to ensure integrity
        this._validateIntegrity();
    }

    static getInstance(state) {
        if (!this.instance) {
            this.instance = new RotationConfig(state);
        }
        return this.instance;
    }

    /**
     * Public API to update configuration
     */
    configure({ retryIntervalMs, maxRetries, rotationIntervalMs }) {
        if (retryIntervalMs != null) this._setRetryInterval(retryIntervalMs);
        if (maxRetries != null) this._setMaxRetries(maxRetries);
        if (rotationIntervalMs != null) this._setRotationInterval(rotationIntervalMs);
    }

    // --- INTERNAL VALIDATION LOGIC ---

    _validateIntegrity() {
        const { retryInterval, maxRetries, rotationInterval } = this.state.constraints;
        // Check if constraint objects exist and have required properties
        const hasRetryInterval = retryInterval && typeof retryInterval.minInterval === 'number' && typeof retryInterval.maxInterval === 'number';
        const hasMaxRetries = maxRetries && typeof maxRetries.minRetries === 'number' && typeof maxRetries.maxRetries === 'number';
        const hasRotationInterval = rotationInterval && typeof rotationInterval.minInterval === 'number' && typeof rotationInterval.maxInterval === 'number';

        if (!hasRetryInterval || !hasMaxRetries || !hasRotationInterval) {
            throw new Error("RotationConfigManager: Constraints are not properly set.");
        }
    }

    _setRetryInterval(ms) {
        if (typeof ms !== 'number') throw new Error("retryIntervalMs must be a number");

        const { minInterval, maxInterval } = this.state.constraints.retryInterval;
        if (ms < minInterval || ms > maxInterval) {
            throw new Error(`retryIntervalMs must be between ${minInterval} and ${maxInterval}`);
        }

        this.state.retryIntervalMs = ms;
    }

    _setMaxRetries(count) {
        if (!Number.isInteger(count)) throw new Error("maxRetries must be an integer");

        const { minRetries, maxRetries } = this.state.constraints.maxRetries;
        if (count < minRetries || count > maxRetries) {
            throw new Error(`maxRetries must be between ${minRetries} and ${maxRetries}`);
        }

        this.state.maxRetries = count;
    }

    _setRotationInterval(ms) {
        if (typeof ms !== 'number') throw new Error("rotationIntervalMs must be a number");
        const { minInterval, maxInterval } = this.state.constraints.rotationInterval;
        if (ms < minInterval || ms > maxInterval) {
            throw new Error(`rotationIntervalMs must be between ${minInterval} and ${maxInterval}`);
        }
        this.state.rotationIntervalMs = ms;
    }

}

export { RotationConfig };