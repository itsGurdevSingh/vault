class Rotator {

    #previousKid = null;
    #upcomingKid = null;

    constructor({ keyGenerator, keyJanitor, keyResolver, metadataManager, LockRepo }) {
        this.keyGenerator = keyGenerator;
        this.keyJanitor = keyJanitor;
        this.keyResolver = keyResolver;
        this.metadataManager = metadataManager;
        this.lockRepo = LockRepo;
    }


    async rotateKeys(domain, updateRotationDatesCB, session) {
        // validate parameters
        if (!updateRotationDatesCB || !domain || typeof updateRotationDatesCB !== 'function') {
            // we need to update rotation dates in db transaction throw error
            throw new Error("Invalid parameters for key rotation.");
        }
        // acquire lock for rotation 
        const token = await this.lockRepo.acquire(domain, 300); // 5 minutes timeout
        if (!token) {
            console.log(`Domain "${domain}" is already being rotated.`);
            return null;
        }

        try {
            // perform rotation
            return await this.#performRotation(domain, updateRotationDatesCB, session);
        } finally {
            // release only if *we* hold the lock
            await rotationLockRepo.release(domain, token);
        }
    }

    async #performRotation(domain, updateRotationDatesCB, session) {

        try {
            // prepare rotation
            await this.#prepareRotation(domain);

            // start db transaction
            session.startTransaction();

            // run db transaction if provided
            await updateRotationDatesCB(session);
            // commit rotation
            const newActiveKid = await this.#commitRotation(domain);

            // commit db transaction
            await session.commitTransaction();

            return newActiveKid;

        } catch (err) {

            // rollback rotation on error
            const activeKid = await this.#rollbackRotation(domain);

            if (!activeKid) {
                // this is crucial , should not happen
                throw new Error("No active kid found after rollback.");
            }

            // abort db transaction
            await session.abortTransaction();

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
        // delete upcoming kid's private key
        if (!this.#upcomingKid) {
            // this is crucial , should not happen
            throw new Error("No upcoming kid found for rollback.");
        }
        await this.keyJanitor.deletePrivate(domain, this.#upcomingKid);
        // also delete public key
        await this.keyJanitor.deletePublic(domain, this.#upcomingKid);

        // remove metadata for upcoming kid
        await this.keyJanitor.deleteOriginMetadata(domain, this.#upcomingKid);

        // remove meta from archive for active kid
        const activeKid = await this.getActiveKid(domain);

        if (!activeKid) {
            // this is crucial , should not happen
            throw new Error("No active kid found for rollback.");
        }

        await this.keyJanitor.deleteArchivedMetadata(activeKid);

        // clear upcoming kid
        this.#upcomingKid = null;

        // return active kid
        return activeKid;
    }

}

export { Rotator };