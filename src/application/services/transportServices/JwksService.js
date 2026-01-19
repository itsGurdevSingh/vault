export class JwksService {
  constructor({ keyManager }) {
    this.keyManager = keyManager;
  }

  async getJwks(domain) {
    if (!domain) {
      throw new Error("Domain is required");
    }

    return this.keyManager.getJwks(domain);
  }
}
