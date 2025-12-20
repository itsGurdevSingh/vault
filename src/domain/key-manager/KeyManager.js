import { KeyLoader } from './KeyLoader.js';
import { JWKSBuilder, KeyPairGenerator } from '../../infrastructure/crypto/index.js';
import { keyJanitor } from './KeyJanitor.js';
import mongoose from 'mongoose';
import { rotationLockRepo } from '../../infrastructure/cache/index.js';

const _INSTANCE_TOKEN = Symbol('KeyManager.instance');
const _internal = new WeakMap();

class KeyManager {

    #upcomingKid = null;
    #previousKid = null;

    constructor(token) {
        if (token !== _INSTANCE_TOKEN) {
            throw new Error('Use KeyManager.getInstance() instead.');
        }

        this.cache = {
            generator: new Map(), // domain -> KeyPairGenerator
            loaders: new Map(), // domain -> KeyLoader
            builders: new Map() // domain -> JWKSBuilder
        }

        this.locks = new Map();

        keyJanitor.init(this);

    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new KeyManager(_INSTANCE_TOKEN);
        }
        return this._instance;
    }

    grantAccess(friend) {
        _internal.set(friend, {
            loader: this.#resolveLoader.bind(this),
            builder: this.#resolveBuilder.bind(this),
            generator: this.#resolveGenerator.bind(this),
        });
    }

    _getResolvers(friend) {
        const resolvers = _internal.get(friend);
        if (!resolvers) throw new Error("Unauthorized");
        return resolvers;
    }

    _normalizeDomain(domain) {
        if (!domain) throw new Error("Domain is required.");
        return domain.toUpperCase().trim();
    }

    // PRIVATE: get or create loader
    async #resolveLoader(domain) {
        const d = this._normalizeDomain(domain);

        if (this.cache.loaders.has(d)) {
            return this.cache.loaders.get(d);
        }

        const loader = await KeyLoader.create(d);
        this.cache.loaders.set(d, loader);

        return loader;
    }

    async #resolveBuilder(domain) {
        const d = this._normalizeDomain(domain);

        if (this.cache.builders.has(d)) {
            return this.cache.builders.get(d);
        }

        const builder = new JWKSBuilder(d);
        this.cache.builders.set(d, builder);
        return builder;
    }

    async #resolveGenerator(domain) {
        const d = this._normalizeDomain(domain);

        if (this.cache.generator.has(d)) {
            return this.cache.generator.get(d);
        }
        const generator = await KeyPairGenerator.create(d);
        this.cache.generator.set(d, generator);
        return generator;
    }

    // High-level API ----

    async generateKeyPair(domain) {
        const generator = await this.#resolveGenerator(domain);
        return await generator.generateRSAKeyPair();
    }

    async getJwks(domain) {
        const builder = await this.#resolveBuilder(domain);
        return await builder.getJwks();
    }

    async getPublicKeys(domain) {
        const loader = await this.#resolveLoader(domain);
        return await loader.getPublicKeyMap();
    }

    async getSigningKey(domain) {
        const loader = await this.#resolveLoader(domain);
        return await loader.getSigningKey();
    }

    async setActiveKid(domain, kid) {
        const loader = await this.#resolveLoader(domain);
        await loader.setActiveKid(kid);
    }

    async getActiveKid(domain) {
        const loader = await this.#resolveLoader(domain);
        return loader.activeKid;
    }

    async rotateKeys(domain, updateRotationDatesCB) {
        const d = this._normalizeDomain(domain);

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
        const newKid = await this.generateKeyPair(domain);

        // set upcoming kid
        this.#upcomingKid = newKid;

        // store archived meta for current active key
        const activeKid = await this.getActiveKid(domain);

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
        this.#previousKid = await this.getActiveKid(domain);

        if (!this.#previousKid) {
            // we not use rotation for first time setup we use generation only 
            throw new Error("No previous kid found for commit.");
        }

        // set upcoming kid to active
        const activeKid = await this.setActiveKid(domain, this.#upcomingKid);

        if (!activeKid) {
            // this is crucial , should not happen
            throw new Error("No upcoming kid set for commit.");
        }

        // clear upcoming kid
        this.#upcomingKid = null;

        // delate private key
        await keyJanitor.retirePrivateKey(domain, this.#previousKid);

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
        await keyJanitor.retirePrivateKey(domain, this.#upcomingKid);
        // also delete public key
        await keyJanitor.deletePublicKey(domain, this.#upcomingKid);

        // remove metadata for upcoming kid
        await keyJanitor.deleteOriginMetadata(domain, this.#upcomingKid);

        // remove meta from archive for active kid
        const activeKid = await this.getActiveKid(domain);

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

    clearCache() {

        // clear individual caches first
        for (const loader of this.cache.loaders.values()) {
            loader.clearCache();
        }
        for (const builder of this.cache.builders.values()) {
            builder.clearCache();
        }

        // clear main caches
        this.cache.generator.clear();
        this.cache.loaders.clear();
        this.cache.builders.clear();


    }
}

export const keyManager = KeyManager.getInstance();
