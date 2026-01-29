import { GarbagePort } from "../../application/ports/GarbagePort.js";

export class GarbageStoreAdapter extends GarbagePort {
  constructor(repository) {
    super();
    this.repo = repository;
  }

  async create(record) {
    return await this.repo.create(record);
  }

  async findPendingByDomain(domain) {
    return await this.repo.findPendingByDomain(domain);
  }

  async findPending(limit) {
    return await this.repo.findPending(limit);
  }

  async markCleaned(id) {
    return await this.repo.markCleaned(id);
  }

  async markFailed(id, error) {
    return await this.repo.markFailed(id, error);
  }

  async markCritical(id, error) {
    return await this.repo.markCritical(id, error);
  }

  async incrementRetry(id, error) {
    return await this.repo.incrementRetry(id, error);
  }

  async exists(domain, kid, reason) {
    return await this.repo.exists(domain, kid, reason);
  }
}
