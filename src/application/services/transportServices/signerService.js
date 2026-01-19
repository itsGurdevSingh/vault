export class SignerService {
    constructor({ keyManager }) {
        this.keyManager = keyManager;
    }
    async sign(domain, payload) {
        if (!domain) {
            throw new Error("Domain is required");
        }
        if (!payload) {
            throw new Error("Payload is required");
        }
        return await this.keyManager.sign(domain, payload);
    }
}