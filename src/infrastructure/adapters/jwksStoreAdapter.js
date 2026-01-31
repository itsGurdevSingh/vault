import { JwksStorePort } from "../../application/ports/jwksStorePort";

export class JwksStoreAdapter extends JwksStorePort {
    constructor({ repository }) {
        super();
        this.repo = repository;
    }
    async create(jwk) {
        return this.repo.create(jwk);
    }
    async find(kid) {
        return this.repo.find(kid);
    }
    async delete(kid) {
        return this.repo.delete(kid);
    }
}