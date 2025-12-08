import { KIDFactory } from "./KIDFactory.js";
import { DirManager } from "./DirManager.js";
import { RSAKeyGenerator } from "./RSAKeyGenerator.js";
import { KeyWriter } from "./KeyWriter.js";
import { metadataManager } from "../../../domain/metadata-manager/index.js";

class KeyPairGenerator {
    async generate(domain) {

        await DirManager.ensure(domain);

        const kid = KIDFactory.generate(domain);

        const { publicKey, privateKey } = await RSAKeyGenerator.generate();

        await KeyWriter.save(domain, kid, publicKey, privateKey);

        await metadataManager.create(domain, kid, new Date());

        return kid;
    }
}

//========================= singleton export =========================//
export const keyPairGenerator = new KeyPairGenerator();

