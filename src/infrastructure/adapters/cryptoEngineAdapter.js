import { CryptoEnginePort } from "../../application/ports/cryptoEnginePort.js";

export class CryptoEngineAdapter extends CryptoEnginePort {
    constructor(cryptoEngine) {
        super();
        this.cryptoEngine = cryptoEngine;
    }

    async generateKeyPair() {
        return this.cryptoEngine.generateKeyPair();
    }
    async pemToJWK(pem, kid) {
        return this.cryptoEngine.pemToJWK(pem, kid);
    }
    async importPrivateKey(pem) {
        return this.cryptoEngine.importPrivateKey(pem);
    }
    async sign(privateKey, data) {
        return this.cryptoEngine.sign(privateKey, data);
    }
    generateKID(domain) {
        return this.cryptoEngine.generateKID(domain);
    }
    getInfo(kid) {
        return this.cryptoEngine.getInfo(kid);
    }
    buildTokenParts(payload, kid, options) {
        return this.cryptoEngine.buildTokenParts(payload, kid, options);
    }
    pemToArrayBuffer(pem) {
        return this.cryptoEngine.pemToArrayBuffer(pem);
    }
    async computeHash(data) {
        return this.cryptoEngine.computeHash(data);
    }
}