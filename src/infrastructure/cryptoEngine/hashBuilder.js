
export class HashBuilder {

    constructor({ crypto }) {
        this.crypto = crypto;
    }

    buildSnapshotHash(snapshot) {
        const canonical = canonicalizeSnapshot(snapshot);

        const json = JSON.stringify(canonical);
        return this.crypto
            .createHash("sha256")
            .update(json)
            .digest("hex");
    }
}
