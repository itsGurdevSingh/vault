export class initializeDomain {

    constructor({ state, generator, policyRepo }) {
        this.state = state;
        this.generator = generator;
        this.policyRepo = policyRepo;
    }

    async setupDomain({ domain, policyOpts = {} }) {
        // check if policy already exists
        const existingPolicy = await this.policyRepo.findByDomain(domain);
        if (existingPolicy) {
            console.log(`Rotation policy for domain ${domain} already exists.`);
            return { message: "Policy already exists" };
        }
        // 1. Generate
        const newKid = await this.generator.generate(domain);

        // 2. Determine rotation interval
        const rotationIntervalDays = policyOpts.rotationInterval || this.state.getConfig().rotationIntervalMs ;

        // 3. Create Rotation Policy 
        const policyData = {
            domain: domain,
            activeKid: newKid,
            rotationInterval: rotationIntervalDays, // in days
            rotatedAt: Date.now(),
            nextRotationAt: new Date(Date.now() + rotationIntervalDays * 24 * 60 * 60 * 1000),
            enabled: true,
            note: policyOpts.note || `Initial setup policy for [ ${domain} ] domain.`
        };


        await this.policyRepo.createPolicy(policyData);

        return { success: true, kid: newKid };

    }

    static getInstance({ state, generator, policyRepo }) {
        if (!this.instance) {
            this.instance = new initializeDomain({ state, generator, policyRepo });
        }
        return this.instance;
    }

}