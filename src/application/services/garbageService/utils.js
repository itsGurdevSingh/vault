export function isSetEmpty(garbageSet) {
    const { privateKeys, publicKeys, originMeta, archivedMeta } = garbageSet;
    
    return (privateKeys.size === 0)
        && (publicKeys.size === 0)
        && (originMeta.size === 0)
        && (archivedMeta.size === 0);
}