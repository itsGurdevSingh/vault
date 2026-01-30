export class RotationPolicyPort {

    // not implemented yet
    async createPolicy(record) {
        throw new Error("Not implemented");
    } 

    async findByDomain(domain) {
        throw new Error("Not implemented");
    }

    async getDueForRotation() {
        throw new Error("Not implemented");
    }

    async getSession() {
        throw new Error("Not implemented");
    }

    async acknowledgeSuccessfulRotation(policy, newKid, session) {
        throw new Error("Not implemented");
    }

    // for snapshot building
    async getActiveKid(domain) {
        throw new Error("Not implemented");
    }

    async getAvailableDomains() {
        throw new Error("Not implemented");
    }
}

