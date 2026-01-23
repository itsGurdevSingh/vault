export class MetadataStoreError extends Error {
    constructor(message, { domain = null, kid = null, cause = null } = {}) {
        super(message);
        this.name = "MetadataStoreError";
        this.domain = domain;
        this.kid = kid;
        this.cause = cause;
    }
}

export class MetadataNotFoundError extends MetadataStoreError {
    constructor({ domain = null, kid = null }) {
        super("Metadata not found", { domain, kid });
        this.name = "MetadataNotFoundError";
    }
}
