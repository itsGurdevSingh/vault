import { pathsRepo } from "../../filesystem";
import { writeFile } from "fs/promises";

export class KeyWriter {
    static async save(domain, kid, publicKey, privateKey) {
        await writeFile(pathsRepo.privateKey(domain, kid), privateKey, { mode: 0o600 });
        await writeFile(pathsRepo.publicKey(domain, kid), publicKey, { mode: 0o644 });
    }
}
