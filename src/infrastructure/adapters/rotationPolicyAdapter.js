import { RotationPolicyPort } from "../../application/ports/RotationPolicyPort";

export class RotationPloicyAdapter extends RotationPolicyPort {
    constructor(repository) {
        super();
        this.repo = repository;
    }

    async createPolicy(record) {
        return this.repo.createPolicy(record);
    }

    async findByDomain(domain) {
        return this.repo.findByDomain(domain);
    }

    async getDueForRotation() {
        return this.repo.getDueForRotation();
    }

    async getSession() {
        return this.repo.getSession();
    }

    async acknowledgeSuccessfulRotation(policy, newKid, session) {
        return this.repo.acknowledgeSuccessfulRotation(policy, newKid, session);
    }
    
    // for snapshot building
    
    async getAvailableDomains() {
        return this.repo.getAvailableDomains();
    }

    async getActiveKid(domain) {
        return this.repo.getActiveKid(domain);
    }
}