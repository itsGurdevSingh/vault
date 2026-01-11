class Rotator {

    #previousKid = null;
    #upcomingKid = null;

    constructor({ keyGenerator, keyJanitor, keyResolver, metadataManager, lockRepository }) {
        this.keyGenerator = keyGenerator;
        this.keyJanitor = keyJanitor;
        this.keyResolver = keyResolver;
        this.metadataManager = metadataManager;
        this.lockRepository = lockRepository;
    }


    async rotateKeys(domain, updateRotationDatesCallback, session) {
        // validate parameters
        if (!updateRotationDatesCallback || !domain || typeof updateRotationDatesCallback !== 'function') {
            // we need to update rotation dates in db transaction throw error
            throw new Error("Invalid parameters for key rotation.");
        }
        // acquire lock for rotation 
        const token = await this.lockRepository.acquire(domain, 300); // 5 minutes timeout
        if (!token) {
            console.log(`Domain "${domain}" is already being rotated.`);
            return null;
        }

        try {
            // perform rotation
            return await this.#performRotation(domain, updateRotationDatesCallback, session);
        } finally {
            // release only if *we* hold the lock
            await this.lockRepository.release(domain, token);
        }
    }

    async #performRotation(domain, updateRotationDatesCallback, session) {

        try {
            // prepare rotation
            await this.#prepareRotation(domain);

            // start db transaction
            session.startTransaction();

            // run db transaction if provided
            await updateRotationDatesCallback(session);
            // commit rotation
            const newActiveKid = await this.#commitRotation(domain);

            // commit db transaction
            await session.commitTransaction();

            return newActiveKid;

        } catch (err) {

            // rollback rotation on error
            const activeKid = await this.#rollbackRotation(domain);

            // abort db transaction
            await session.abortTransaction();

            if (!activeKid) {
                // Critical error: no active kid to roll back to
                console.error(`CRITICAL: Key rotation failed for domain "${domain}". No active kid found for rollback. Error:`, err);
                return null;
            }

            console.error(`Key rotation failed for domain "${domain}". Rolled back to active kid "${activeKid}". Error:`, err);
            return null;
        } finally {
            session.endSession();
        }
    }

    /** initial setup for rotation  */
    async #prepareRotation(domain) {
        // generate a new key pair
        const newKid = await this.keyGenerator.generate(domain);

        // set upcoming kid
        this.#upcomingKid = newKid;

        // store archived meta for current active key
        const activeKid = await this.keyResolver.getActiveKid(domain);

        if (!activeKid) {
            // we rotate only if there is an active kid
            // this is crucial , should not happen
            // we use generation only (not rotation) for first time setup
            throw new Error("No active kid found for prepare.");
        }

        await this.keyJanitor.addKeyExpiry(domain, activeKid);

        return newKid;

    }

    async #commitRotation(domain) {
        // set previous kid
        this.#previousKid = await this.keyResolver.getActiveKid(domain);

        if (!this.#previousKid) {
            // we not use rotation for first time setup we use generation only 
            throw new Error("No previous kid found for commit.");
        }

        // set upcoming kid to active
        const activeKid = await this.keyResolver.setActiveKid(domain, this.#upcomingKid);

        if (!activeKid) {
            // this is crucial , should not happen
            throw new Error("No upcoming kid set for commit.");
        }

        // delete private key
        await this.keyJanitor.deletePrivate(domain, this.#previousKid);

        // delete origin metadata for previous active kid
        await this.keyJanitor.deleteOriginMetadata(domain, this.#previousKid);

        // clear upcoming kid
        this.#upcomingKid = null;

        // new active kid
        return activeKid;

    }

    /** rollback key rotation  */
    async #rollbackRotation(domain) {
        // If no upcoming kid was set, means failure happened before generation completed
        // No cleanup needed, just return active kid
        if (!this.#upcomingKid) {
            const activeKid = await this.keyResolver.getActiveKid(domain);
            // Return null if no active kid - outer handler will check and throw if needed
            return activeKid;
        }

        // delete upcoming kid's private key
        await this.keyJanitor.deletePrivate(domain, this.#upcomingKid);
        // also delete public key
        await this.keyJanitor.deletePublic(domain, this.#upcomingKid);

        // remove metadata for upcoming kid
        await this.keyJanitor.deleteOriginMetadata(domain, this.#upcomingKid);

        // remove meta from archive for active kid
        const activeKid = await this.keyResolver.getActiveKid(domain);

        // If no active kid exists, this could happen if the error occurred during prepare
        // before activeKid was confirmed. Return null and let outer handler deal with it.
        if (activeKid) {
            await this.keyJanitor.deleteArchivedMetadata(activeKid);
        }

        // clear upcoming kid
        this.#upcomingKid = null;

        // return active kid (could be null)
        return activeKid;
    }

}

export { Rotator };