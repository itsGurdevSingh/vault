export class RSAKeyGenerator {
    static generate() {
        return new Promise((resolve, reject) => {
            crypto.generateKeyPair(
                'rsa',
                {
                    modulusLength: 4096,
                    publicKeyEncoding: { type: 'spki', format: 'pem' },
                    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
                },
                (err, publicKey, privateKey) => {
                    if (err) return reject(err);
                    resolve({ publicKey, privateKey });
                }
            );
        });
    }
}
