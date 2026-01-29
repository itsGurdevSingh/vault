export class GarbageCollector {
  constructor({
    domainSnapshotBuilder, // domain
    garbagePort, // port
    rotationPolicyPort, // port
    cryptoEngine, // infra
    rotationLockRepository, // infra
    utils, // internal
    logger = console // infra
  }) {
    this.domainSnapshotBuilder = domainSnapshotBuilder;
    this.garbageStore = garbagePort;
    this.rotationPolicyStore = rotationPolicyPort;
    this.cryptoEngine = cryptoEngine;
    this.rotationLockRepository = rotationLockRepository;
    this.utils = utils;
    this.logger = logger;
  }

  /* -------------------------------------------------- */
  /* Canonical snapshot (stable hashing)                */
  /* -------------------------------------------------- */
  #canonicalizeSnapshot(snapshot) {
    return {
      domain: snapshot.domain,
      activeKid: snapshot.activeKid,

      privateKeys: [...snapshot.privateKeys].sort(),
      publicKeys: [...snapshot.publicKeys].sort(),
      originMeta: [...snapshot.originMeta].sort(),

      archivedMeta: [...snapshot.archivedMeta.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([kid, expiresAt]) => ({
          kid,
          expiresAt: expiresAt?.toISOString?.() ?? expiresAt
        }))
    };
  }

  async #computeSnapshotHash(snapshot) {
    const canonical = this.#canonicalizeSnapshot(snapshot);
    return this.cryptoEngine.computeHash(JSON.stringify(canonical));
  }

  /* -------------------------------------------------- */
  /* Single domain processing                           */
  /* -------------------------------------------------- */
  async #processDomain(domain) {
    const token = await this.rotationLockRepository.acquire(domain, 5 * 60);
    if (!token) {
      this.logger.log(
        `[GC] Skipping ${domain} — locked for rotation`
      );
      return;
    }

    try {
      const snapshot = await this.domainSnapshotBuilder.build(domain);
      const snapshotHash = await this.#computeSnapshotHash(snapshot);

      const existingRecord =
        await this.garbageStore.findPendingByDomain(domain);

      if (
        existingRecord &&
        existingRecord.snapshotHash === snapshotHash
      ) {
        this.logger.log(
          `[GC] ${domain} unchanged — pending garbage already recorded`
        );
        return;
      }

      const garbageSet = snapshot.collectGarbage();

      if (this.utils.isSetEmpty(garbageSet)) {
        this.logger.log(`[GC] ${domain} is clean`);
        return;
      }

      await this.garbageStore.create({
        domain,
        snapshotHash,
        garbageSet,
        status: "PENDING"
      });

      this.logger.log(
        `[GC] Garbage recorded for ${domain}`,
        garbageSet
      );
    } catch (err) {
      this.logger.error(
        `[GC] Error while collecting garbage for ${domain}`,
        err
      );
    } finally {
      await this.rotationLockRepository.release(domain, token);
    }
  }

  /* -------------------------------------------------- */
  /* Public API                                         */
  /* -------------------------------------------------- */
  async run() {
    const domains =
      await this.rotationPolicyStore.getAvailableDomains();

    for (const domain of domains) {
      await this.#processDomain(domain);
    }

    this.logger.log("[GC] Garbage collection completed");
  }
}
