export class GarbageCleaner {
  constructor({
    domainSnapshotBuilder, // doamin
    garbagePort, // port
    janitor, // domain
    Stores, // infra
    utils, // intenal
    logger = console // infra
  }) {
    this.snapshotBuilder = domainSnapshotBuilder;
    this.garbageStore = garbagePort;
    this.janitor = janitor;
    this.Stores = Stores; // array of all file stores class instances
    this.utils = utils;
    this.logger = logger;
  }

  /* -------------------------------------------------- */
  /* Internal helpers                                   */
  /* -------------------------------------------------- */

  async #cleanupSet(set, janitorMethod, domain, label) {
    if (!set || set.size === 0) return;

    for (const kid of [...set]) {
      try {
        await janitorMethod.call(this.janitor, domain, kid);
        set.delete(kid);
      } catch (err) {
        this.logger.error(
          `[GC-CLEAN] Failed to clean ${label} (${kid}) for ${domain}`,
          err
        );
      }
    }
  }

  async #runJanitorCleanup(domain, garbageSet) {
    const { privateKeys, publicKeys, originMeta, archivedMeta } = garbageSet;

    await this.#cleanupSet(
      privateKeys,
      this.janitor.deletePrivate,
      domain,
      "PRIVATE_KEY"
    );

    await this.#cleanupSet(
      publicKeys,
      this.janitor.deletePublic,
      domain,
      "PUBLIC_KEY"
    );

    await this.#cleanupSet(
      originMeta,
      this.janitor.deleteOriginMetadata,
      domain,
      "ORIGIN_METADATA"
    );

    await this.#cleanupSet(
      archivedMeta,
      this.janitor.deleteArchivedMetadata,
      domain,
      "ARCHIVED_METADATA"
    );

    return garbageSet;
  }

  /* -------------------------------------------------- */
  /* Single record cleanup                              */
  /* -------------------------------------------------- */

  async #processRecord(record) {
    const { id, domain, garbageSet } = record;

    try {
      const snapshot = await this.snapshotBuilder.build(domain);

      // 1. Simulate cleanup first (NO SIDE EFFECTS)
      const simulatedSnapshot =
        snapshot.simulateCleanup(garbageSet);

      const isHealthy =
        simulatedSnapshot.isHealthy();

      if (!isHealthy) {
        this.logger.error(
          `[GC-CLEAN] Health check FAILED for ${domain}`,
          garbageSet
        );

        await this.garbageStore.markCritical(
          id,
          "Cleanup simulation breaks domain health"
        );
        return;
      }

      // 2. Perform real cleanup
      const remaining =
        await this.#runJanitorCleanup(domain, garbageSet);

      // 3. Final state handling
      if (this.utils.isSetEmpty(remaining)) {
        await this.garbageStore.markCleaned(id);
        this.logger.log(
          `[GC-CLEAN] Garbage fully cleaned for ${domain}`
        );
      } else {
        await this.garbageStore.incrementRetry(
          id,
          "Partial cleanup completed"
        );
        this.logger.warn(
          `[GC-CLEAN] Partial cleanup for ${domain}, will retry`,
          remaining
        );
      }
    } catch (err) { 
      // log alert on max retries reached 
      if(record.retries + 1 >= 5) {
        this.logger.error(
          `[GC-CLEAN] Max retries reached for ${domain}, marking as CRITICAL`
        );
        await this.garbageStore.markCritical(
          id,
          err.message
        );
        return;
      }

      // Unexpected failure handling
      this.logger.error(
        `[GC-CLEAN] Unexpected failure for ${domain}`,
        err
      );

      await this.garbageStore.incrementRetry(
        id,
        err.message
      );
    }
  }

  /* -------------------------------------------------- */
  /* Public API                                         */
  /* -------------------------------------------------- */

  async run() {
    const pendingRecords =
      await this.garbageStore.findPending();

    for (const record of pendingRecords) {
      await this.#processRecord(record);
    }

    for (const store of this.Stores) {
      if(typeof store.cleanTmpResidue === "function"){
        await store.cleanTmpResidue();
        this.logger.log("[GC-CLEAN] Temporary residue cleanup completed for file store");
      }
    }

    this.logger.log("[GC-CLEAN] Garbage cleanup run completed");
  }
}
