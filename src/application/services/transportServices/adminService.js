export class AdminService {
    constructor({ adminRepository }) {
        this.adminRepository = adminRepository;
    }

    // rotate all remaining domains
    async rotateAllDomains() {
        return this.adminRepository.rotate();
    }

    // rotate specific domain
    async rotateDomain(domain) {
        return this.adminRepository.rotateDomain(domain);
    }

    // itial setup for a domain
    async initialSetupDomain(domain, policyOpts = {}) {
        return this.adminRepository.initialSetupDomain(domain, policyOpts);
    }

    // configure rotation settings
    async configureRotationSettings(settings) {
        return this.adminRepository.configure(settings);
    }

}