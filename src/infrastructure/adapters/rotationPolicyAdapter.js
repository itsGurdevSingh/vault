import { RotationPolicyPort } from "../../application/ports/RotationPolicyPort";

export class RotationPloicyAdapter extends RotationPolicyPort {
    constructor(repository) {
        super();
        this.repo = repository;
    }
    
    // for snapshot building
    
    async getAvailableDomains() {
        return this.repo.getAvailableDomains();
    }

    async getActiveKid(domain) {
        return this.repo.getActiveKid(domain);
    }
}