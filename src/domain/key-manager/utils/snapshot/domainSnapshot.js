export class DomainSnapshot {
  constructor({
    domain,
    activeKid,
    privateKeys,
    publicKeys,
    originMeta,
    archivedMeta // Map<kid, expiresAt>
  }) {
    this.domain = domain;
    this.activeKid = activeKid;

    this.privateKeys = new Set(privateKeys);
    this.publicKeys = new Set(publicKeys);
    this.originMeta = new Set(originMeta);
    this.archivedMeta = new Map(archivedMeta);
  }

  /* =====================================================
   *  BASIC DERIVED VIEWS
   * ===================================================== */

  hasActiveKid() {
    return Boolean(this.activeKid);
  }

  isActiveKid(kid) {
    return kid === this.activeKid;
  }

  isArchived(kid) {
    return this.archivedMeta.has(kid);
  }

  isExpiredArchived(kid, now = new Date()) {
    const expiresAt = this.archivedMeta.get(kid);
    return expiresAt && expiresAt <= now;
  }

  /* =====================================================
   *  GARBAGE DETECTION (NO SAFETY CHECKS)
   * ===================================================== */

  collectGarbage(now = new Date()) {
    const garbage = {
      privateKeys: new Set(),
      publicKeys: new Set(),
      originMeta: new Set(),
      archivedMeta: new Set()
    };


    // ---------- PRIVATE KEYS ----------
    for (const kid of this.privateKeys) {
      if (!this.isActiveKid(kid)) {
        garbage.privateKeys.add(kid);
      }
    }

    // ---------- ORIGIN METADATA ----------
    for (const kid of this.originMeta) {
      if (!this.isActiveKid(kid)) {
        garbage.originMeta.add(kid);
      }
    }

    // ---------- ARCHIVED METADATA ----------
    for (const [kid, expiresAt] of this.archivedMeta.entries()) {
      if (expiresAt <= now) {
        garbage.archivedMeta.add(kid);
      }
    }

    // ---------- PUBLIC KEYS ----------
    for (const kid of this.publicKeys) {
      const isActive = this.isActiveKid(kid);
      const isOrigin = this.originMeta.has(kid);
      const isArchived = this.archivedMeta.has(kid);
      const isExpiredArchive =
        isArchived && this.isExpiredArchived(kid, now);

      // public key valid only if:
      // - active
      // - OR origin meta exists
      // - OR archived meta exists AND not expired
      if (!isActive && !isOrigin && !isArchived) {
        garbage.publicKeys.add(kid);
      }

      if (isExpiredArchive) {
        garbage.publicKeys.add(kid);
      }
    }

    return GarbageSet.from(garbage);
  }

  /* =====================================================
   *  CLEANUP SIMULATION (CRITICAL)
   * ===================================================== */

  simulateCleanup(garbageSet) {
    const clone = this.clone();

    for (const kid of garbageSet.privateKeys) {
      clone.privateKeys.delete(kid);
    }

    for (const kid of garbageSet.publicKeys) {
      clone.publicKeys.delete(kid);
    }

    for (const kid of garbageSet.originMeta) {
      clone.originMeta.delete(kid);
    }

    for (const kid of garbageSet.archivedMeta) {
      clone.archivedMeta.delete(kid);
    }

    return clone;
  }

  /* =====================================================
   *  HEALTH CHECK (USED BY CLEANER ONLY)
   * ===================================================== */

  isHealthy(cleanSet) {
    if (!cleanSet.activeKid) return false;

    // active kid must exist everywhere
    if (!cleanSet.privateKeys.has(cleanSet.activeKid)) return false;
    if (!cleanSet.publicKeys.has(cleanSet.activeKid)) return false;
    if (!cleanSet.originMeta.has(cleanSet.activeKid)) return false;

    // every origin meta must have both keys
    for (const kid of cleanSet.originMeta) {
      if (!cleanSet.privateKeys.has(kid)) return false;
      if (!cleanSet.publicKeys.has(kid)) return false;
    }

    // archived meta must have public key
    for (const kid of cleanSet.archivedMeta.keys()) {
      if (!cleanSet.publicKeys.has(kid)) return false;
    }

    // public keys count invariant
    const expected =
      cleanSet.originMeta.size + cleanSet.archivedMeta.size;
    if (cleanSet.publicKeys.size !== expected) return false;

    return true;
  }

  /* =====================================================
   *  UTIL
   * ===================================================== */

  clone() {
    return new DomainSnapshot({
      domain: this.domain,
      activeKid: this.activeKid,
      privateKeys: new Set(this.privateKeys),
      publicKeys: new Set(this.publicKeys),
      originMeta: new Set(this.originMeta),
      archivedMeta: new Map(this.archivedMeta)
    });
  }
}
