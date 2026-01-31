export class AdminService {
    constructor({ adminRepository , rotationScheduler, configManager}) {
        this.adminRepository = adminRepository;
        this.scheduler = rotationScheduler;
        this.configManager = configManager;
    }

    // rotate all remaining domains
    async rotateAllDomains() {
        return await this.scheduler.triggerImmediateRotation();
    }

    // rotate specific domain
    async rotateDomain(domain) {
        return await this.scheduler.triggerDomainRotation(domain);;
    }

    // itial setup for a domain
    async initialSetupDomain(domain, policyOpts = {}) {
        return this.adminRepository.initialSetupDomain(domain, policyOpts);
    }

    // configure rotation settings
    async configureRotationSettings(settings) {
        return this.configManager.configure(settings);
    }

}