import { CryptoConfig } from './cryptoConfig.js';
import { pemToArrayBuffer, base64UrlEncode, assertPlainObject } from './utils.js';
import { TokenBuilder } from './tokenBuilder.js';
import { KIDFactory } from './KIDFactory.js';
import { CryptoEngine } from './CryptoEngine.js';
import { HashBuilder } from './hashBuilder.js';

class EngineFactory {
    constructor(cryptoModule) {
        this.cryptoModule = cryptoModule;
    }

    create() {
        const config = CryptoConfig;
        const utils = { pemToArrayBuffer, base64UrlEncode, assertPlainObject };

        // Instantiate dependencies with injections
        const tokenBuilder = new TokenBuilder(utils);
        const kidFactory = new KIDFactory(this.cryptoModule);
        const HashBuilder = new HashBuilder({ crypto: this.cryptoModule });
        return new CryptoEngine({
            cryptoModule: this.cryptoModule,
            config,
            utils,
            tokenBuilder,
            kidFactory,
            hashBuilder: HashBuilder
        });
    }

    static getInstance(cryptoModule) {
        if (!this._instance) {
            this._instance = new EngineFactory(cryptoModule);
        }
        return this._instance;
    }
}

export { EngineFactory };