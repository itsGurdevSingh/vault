export class DomainSnapshotBuilder {
  constructor({ keyStore, metadataStore, policyStore , domainSnapshot }) {
    this.keyStore = keyStore;
    this.metadataStore = metadataStore;
    this.policyStore = policyStore;
    this.domainSnapshot = domainSnapshot;
  }

  async build(domain) {
    const [
      activeKid,
      privateKids,
      publicKids,
      originKids,
      archivedMetas
    ] = await Promise.all([
      this.policyStore.getActiveKid(domain),
      this.keyStore.listPrivateKids(domain),
      this.keyStore.listPublicKids(domain),
      this.metadataStore.listOriginKids(domain),
      this.metadataStore.listArchivedMetas(domain)
    ]);

    return new this.domainSnapshot({
      domain,
      activeKid,
      privateKeys: new Set(privateKids),
      publicKeys: new Set(publicKids),
      originMeta: new Set(originKids),
      archivedMeta: new Map(
        archivedMetas.map(m => [m.kid, m.expiresAt])
      )
    });
  }
}
