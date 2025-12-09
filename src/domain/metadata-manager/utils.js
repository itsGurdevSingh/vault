export function isExpired(meta, now = Date.now()) {
    if (!meta.expiredAt) return false;
    return new Date(meta.expiredAt).getTime() <= now;
}
