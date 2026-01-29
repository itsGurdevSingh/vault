export class GarbageRepository {
  constructor({ model }) {
    this.model = model;
  }

  async create(record) {
    return this.model.create(record);
  }

  async findPendingByDomain(domain) {
    return this.model
      .findOne({ domain, status: "PENDING" })
      .lean();
  }

  async findPending(limit = 100) {
    return this.model
      .find({ status: "PENDING" })
      .limit(limit)
      .lean();
  }

  async markCleaned(id) {
    return this.model.findByIdAndUpdate(
      id,
      { status: "CLEANED" },
      { new: true }
    );
  }

  async markFailed(id, error) {
    return this.model.findByIdAndUpdate(
      id,
      {
        status: "FAILED",
        lastError: error?.message || String(error)
      },
      { new: true }
    );
  }

  async markCritical(id, error) {
    return this.model.findByIdAndUpdate(
      id,
      {
        status: "CRITICAL",
        lastError: error?.message || String(error)
      },
      { new: true }
    );
  }


  async incrementRetry(id, error) {
    return this.model.findByIdAndUpdate(
      id,
      {
        $inc: { retries: 1 },
        lastError: error?.message || String(error)
      },
      { new: true }
    );
  }

  async exists(domain, kid, reason) {
    return this.model.exists({ domain, kid, reason, status: "PENDING" });
  }
}
