export class MetadataBuilder {

    createMeta(domain, kid, createdAt) {
        return {
            kid,
            domain,
            createdAt: createdAt.toISOString(),
            expiresAt: null,
        };
    }

    applyExpiry(meta, expiresAt) {
        return {
            ...meta,
            expiresAt: expiresAt.toISOString(),
        };
    }
}
