import { KeyPaths } from "../../filesystem";
import { writeFile } from "fs/promises";

export class KeyWriter {
    static async save(domain, kid, publicKey, privateKey) {
        await writeFile(KeyPaths.privateKey(domain, kid), privateKey, { mode: 0o600 });
        await writeFile(KeyPaths.publicKey(domain, kid), publicKey, { mode: 0o644 });
    }
}
