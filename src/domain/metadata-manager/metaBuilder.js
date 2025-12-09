export class MetaBuilder {

    createMeta(domain, kid, createdAt) {
        return {
            kid,
            domain,
            createdAt: createdAt.toISOString(),
            expiredAt: null,
        };
    }

    applyExpiry(meta, expiresAt) {
        return {
            ...meta,
            expiredAt: expiresAt.toISOString(),
        };
    }
}
