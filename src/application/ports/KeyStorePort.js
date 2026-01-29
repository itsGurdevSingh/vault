/**
 * KeyStorePort
 * Abstraction over key persistence.
 * Domain speaks in domain language only.
 */
export class KeyStorePort {
  async saveKeyPair(domain, kid, { publicKey, privateKey }) {
    throw new Error("Not implemented");
  }

  async loadPrivateKey(domain, kid) {
    throw new Error("Not implemented");
  }

  async loadPublicKey(domain, kid) {
    throw new Error("Not implemented");
  }

  async deletePrivateKey(domain, kid) {
    throw new Error("Not implemented");
  }

  async deletePublicKey(domain, kid) {
    throw new Error("Not implemented");
  }

  async listPublicKids(domain) {
    throw new Error("Not implemented");
  }

  async listPrivateKids(domain) {
    throw new Error("Not implemented");
  }

  async cleanTmpResidue(domain) {
    throw new Error("Not implemented");
  }
  
}
