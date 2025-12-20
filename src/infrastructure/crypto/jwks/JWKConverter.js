import { importSPKI, exportJWK } from 'jose';

export class JWKConverter {
    static async fromPEM(pem, kid) {
        const keyObj = await importSPKI(pem, 'RS256');
        const jwk = await exportJWK(keyObj);

        return {
            ...jwk,
            kid,
            use: 'sig',
            alg: 'RS256',
        };
    }
}
