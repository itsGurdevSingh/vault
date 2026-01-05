class KeyCache {
    constructor() {
        this.private = new Map(); // kid -> private key pem
        this.public = new Map(); // kid -> public key pem
    }

    // singoleton class
    static getInstance() {
        if (!this.instance) {
            this.instance = new KeyCache();
        }
        return this.instance;
    }

    getPrivate(kid) { return this.private.get(kid); }
    hasPrivate(kid) { return this.private.has(kid); }
    setPrivate(kid, pem) { this.private.set(kid, pem); }
    deletePrivate(kid) { this.private.delete(kid); }

    getPublic(kid) { return this.public.get(kid); }
    hasPublic(kid) { return this.public.has(kid); }
    setPublic(kid, pem) { this.public.set(kid, pem); }
    deletePublic(kid) { this.public.delete(kid); }

    clear() {
        this.private.clear();
        this.public.clear();
    }
}


export { KeyCache };