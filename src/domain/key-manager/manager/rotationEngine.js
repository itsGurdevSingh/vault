import { normalizeDomain } from "../utils/normalizer.js";
import { keyJanitor } from "../Janitor/index.js";
import { RSAKeyGenerator } from "../../../infrastructure/crypto/index.js";
import { rotationLockRepo } from "../../../infrastructure/cache";
import { activeKidStore } from "../../state/ActiveKIDState.js";

class RotationEngine {

    #upcomingKid = null;
    #previousKid = null;

    async rotateKeys(domain, updateRotationDatesCB) {
        const d = normalizeDomain(domain);

        // acquire lock
        const token = await rotationLockRepo.acquire(d, 300);
        if (!token) {
            console.log(`Domain "${d}" is already being rotated.`);
            return null;
        }

        try {
            // perform rotation
            return await this.#performRotation(domain, updateRotationDatesCB);
        } finally {
            // release only if *we* hold the lock
            await rotationLockRepo.release(d, token);
        }
    }

    async #performRotation(domain, updateRotationDatesCB) {

        if (!updateRotationDatesCB || !domain || typeof updateRotationDatesCB !== 'function') {
            // we need to update rotation dates in db transaction throw error
            throw new Error("Invalid parameters for key rotation.");
        }

        const session = await mongoose.startSession();

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
        const newKid = await RSAKeyGenerator(domain);

        // set upcoming kid
        this.#upcomingKid = newKid;

        // store archived meta for current active key
        const activeKid = await activeKidStore.getActiveKid(domain);

        if (!activeKid) {
            // we rotate only if there is an active kid
            // this is crucial , should not happen
            // we use generation only (not rotation) for first time setup
            throw new Error("No active kid found for prepare.");
        }

        await keyJanitor.addKeyExpiry(domain, activeKid);

        return newKid;

    }

    async #commitRotation(domain) {
        // set previous kid
        this.#previousKid = await activeKidStore.getActiveKid(domain);

        if (!this.#previousKid) {
            // we not use rotation for first time setup we use generation only 
            throw new Error("No previous kid found for commit.");
        }

        // set upcoming kid to active
        const activeKid = await activeKidStore.setActiveKid(domain, this.#upcomingKid);

        if (!activeKid) {
            // this is crucial , should not happen
            throw new Error("No upcoming kid set for commit.");
        }

        // clear upcoming kid
        this.#upcomingKid = null;

        // delate private key
        await keyJanitor.deletePrivate(domain, this.#previousKid);

        // delete origin metadata for previous active kid
        await keyJanitor.deleteOriginMetadata(domain, this.#previousKid);

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
        await keyJanitor.deletePrivate(domain, this.#upcomingKid);
        // also delete public key
        await keyJanitor.deletePublic(domain, this.#upcomingKid);

        // remove metadata for upcoming kid
        await keyJanitor.deleteOriginMetadata(domain, this.#upcomingKid);

        // remove meta from archive for active kid
        const activeKid = await activeKidStore.getActiveKid(domain);

        if (!activeKid) {
            // this is crucial , should not happen
            throw new Error("No active kid found for rollback.");
        }

        await keyJanitor.deleteArchivedMetadata(activeKid);

        // clear upcoming kid
        this.#upcomingKid = null;

        // return active kid
        return activeKid;
    }

}
