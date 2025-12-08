import { KeyPaths } from "../../filesystem";
import { mkdir } from "fs/promises";

export class DirManager {
    static async ensure(domain) {
        await mkdir(KeyPaths.privateDir(domain), { recursive: true });
        await mkdir(KeyPaths.publicDir(domain), { recursive: true });
        await mkdir(KeyPaths.metaKeyDir(domain), { recursive: true });
    }
}

