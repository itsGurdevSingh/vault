import { Signer } from "./signer.js";

class SignerSingleton {
    constructor() {
        if (!SignerSingleton.instance) {
            SignerSingleton.instance = new Signer();
        }
        return SignerSingleton.instance;
    }
}

export const signer = new SignerSingleton();
