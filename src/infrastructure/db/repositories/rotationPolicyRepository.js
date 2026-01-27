import { rotationPolicy } from "../models/RotationPolicy.model.js";

class RotationPolicyRepository {

    constructor() {
        this.model = rotationPolicy;
        this.db = this.model.db;
    }

    async getAvailableDomains() {
        const policies = await this.model.find({}, 'domain').lean();
        return policies.map(p => p.domain);
    }

    async findByDomain(domain) {
        const d = domain.toUpperCase().trim();
        return this.model.findOne({ domain: d });
    }

    async getActiveKid(domain) {
        const d = domain.toUpperCase().trim();
        const policy =  await this.model.findOne({ domain: d });
        return policy ? policy.activeKid : null;
    }

    async createPolicy(data) {
        const d = data.domain.toUpperCase().trim();
        const policy = new this.model({ ...data, domain: d });
        return policy.save();
    }

    async updatePolicy(domain, updates) {
        const d = domain.toUpperCase().trim();
        return this.model.findOneAndUpdate({ domain: d }, updates, { new: true });
    }

    async deletePolicy(domain) {
        const d = domain.toUpperCase().trim();
        return this.model.findOneAndDelete({ domain: d });
    }

    async enableRotation(domain) {
        const d = domain.toUpperCase().trim();
        return this.model.findOneAndUpdate({ domain: d }, { enabled: true }, { new: true });
    }

    async disableRotation(domain) {
        const d = domain.toUpperCase().trim();
        return this.model.findOneAndUpdate({ domain: d }, { enabled: false }, { new: true });
    }

    async getAllPolicies() {
        return this.model.find({});
    }

    async getEnabledPolicies() {
        return this.model.find({ enabled: true });
    }
    // Fetch policies due for rotation ( enabled only)
    async getDueForRotation(currentDate = new Date()) {
        return this.model.find({ nextRotationAt: { $lte: currentDate }, enabled: true });
    }

    async updateRotationDates({ domain, activeKid, rotatedAt, nextRotationAt }, session) {
        const d = domain.toUpperCase().trim();
        return this.model.findOneAndUpdate(
            { domain: d },
            { activeKid, rotatedAt, nextRotationAt },
            { new: true },
            { session }
        );
    }

    /**
     * Updates dates within a transaction.
     */
    async acknowledgeSuccessfulRotation({ domain, intervalDays }, newKid, session) {
        const rotatedAt = new Date();
        const nextRotationAt = new Date(rotatedAt.getTime() + intervalDays * 86400000);

        return this.updateRotationDates({
            domain,
            activeKid: newKid,
            rotatedAt,
            nextRotationAt
        }, session);
    }

    async getSession() {
        return this.db.startSession();
    }

}

export const rotationPolicyRepository = new RotationPolicyRepository();
