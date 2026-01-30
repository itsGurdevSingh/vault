export class CryptoEnginePort {
    async generateKeyPair() {
        throw new Error('Method not implemented.');
    }
    async pemToJWK(pem, kid) {
        throw new Error('Method not implemented.');
    }
    async importPrivateKey(pem) {
        throw new Error('Method not implemented.');
    }
    async sign(privateKey, data) {
        throw new Error('Method not implemented.');
    }
    generateKid(domain) {
        throw new Error('Method not implemented.');
    }
    getInfo(kid) {
        throw new Error('Method not implemented.');
    }
    buildTokenParts(payload, kid, options) {
        throw new Error('Method not implemented.');
    }
    pemToArrayBuffer(pem) {
        throw new Error('Method not implemented.');
    }
    async computeHash(data) {
        throw new Error('Method not implemented.');
    }

}