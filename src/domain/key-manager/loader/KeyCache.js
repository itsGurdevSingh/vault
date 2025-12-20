import { Cache } from "../../../utils/cache";

export class KeyCache {
    constructor() {
        this.private = new Cache();
        this.public = new Cache();
    }

    getPrivate(kid) { return this.private.get(kid); }
    setPrivate(kid, pem) { this.private.set(kid, pem); }

    getPublic(kid) { return this.public.get(kid); }
    setPublic(kid, pem) { this.public.set(kid, pem); }

    deletePrivate(kid) { this.private.delete(kid); }
    deletePublic(kid) { this.public.delete(kid); }

    clear() {
        this.private.clear();
        this.public.clear();
    }
}
