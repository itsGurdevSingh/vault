export function isExpired(meta, now = Date.now()) {
    if (!meta.expiresAt) return false;
    return new Date(meta.expiresAt).getTime() <= now;
}
