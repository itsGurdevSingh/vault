import { KeyReader } from "./KeyReader.js";
import { KeyDirectory } from "./KeyDirectory.js";
import { activeKIDState } from "../../state/ActiveKIDState.js";
import { normalizeDomain } from "../utils/normalizer.js";

export class KeyRegistry {

    static #instances = new Map();

    constructor(domain) {
        this.domain = domain;
        this.reader = new KeyReader(domain);
        this.directory = new KeyDirectory(domain);
    }

    static getInstance(domain) {
        if (!domain) throw new Error("Domain required");
        const d = normalizeDomain(domain);

        if (!this.#instances.has(d)) {
            this.#instances.set(d, new KeyRegistry(d));
        }
        return this.#instances.get(d);
    }

    async getAllPubKids() {
        return await this.directory.listPublicKids();
    }

    async getAllPvtKids() {
        return await this.directory.listPrivateKids();
    }

    async getPubKeyMap() {
        const kids = await this.getAllPubKids();
        const keys = {};

        for (const kid of kids) {
            keys[kid] = await this.reader.publicKey(kid);
        }
        return keys;
    }

    /** Current private signing key */
    async getSigningKey() {
        const kid = await activeKIDState.getActiveKID(this.domain);
        if (!kid) {
            throw new Error(`No active KID set for domain: ${this.domain}`);
        }
        const privateKey = await this.reader.privateKey(kid);
        return { kid, pvtKey };
    }

}
