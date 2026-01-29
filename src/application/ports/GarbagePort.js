export class GarbagePort {
  async create(record) {
    throw new Error("Not implemented");
  }
  
  async findPendingByDomain(domain) {
    throw new Error("Not implemented");
  }

  async findPending(limit) {
    throw new Error("Not implemented");
  }

  async markCleaned(id) {
    throw new Error("Not implemented");
  }

  async markFailed(id, error) {
    throw new Error("Not implemented");
  }

  async markCritical(id, error) {
    throw new Error("Not implemented");
  }

  async incrementRetry(id, error) {
    throw new Error("Not implemented");
  }

  async exists(domain, kid, reason) {
    throw new Error("Not implemented");
  }
}
