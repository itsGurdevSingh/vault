import { mkdir, writeFile, readFile, unlink, readdir } from "fs/promises";

import {
  KeyWriteError,
  KeyReadError,
  KeyDeleteError,
  KeyDirectoryError
} from "../../errors/keysErrors.js";

export class FileSystemKeyStore {
  constructor({ pathResolver, FsUtils }) {
    this.paths = pathResolver;
    this.fsUtils = FsUtils;
  }

  async #ensureDirs(domain) {
    try {
      await this.fsUtils.ensureDir(this.paths.privateDir(domain));
      await this.fsUtils.ensureDir(this.paths.publicDir(domain));
    } catch (err) {
      throw new KeyDirectoryError({ domain, cause: err });
    }
  }

  async saveKeyPair(domain, kid, { publicKey, privateKey }) {
    await this.#ensureDirs(domain);

    const privFinal = this.paths.privateKey(domain, kid);
    const pubFinal = this.paths.publicKey(domain, kid);

    const privTmp = `${privFinal}.tmp`;
    const pubTmp = `${pubFinal}.tmp`;

    try {
      // 1. Write temp files
      await writeFile(privTmp, privateKey, { mode: 0o600 });
      await writeFile(pubTmp, publicKey, { mode: 0o644 });

      // 2. Atomic rename (commit)
      await rename(privTmp, privFinal);
      await rename(pubTmp, pubFinal);

    } catch (err) {
      // 3. Cleanup temp files only
      await Promise.allSettled([
        // not thorw error if file not exists
        this.fsUtils.safeUnlink(privTmp),
        this.fsUtils.safeUnlink(pubTmp),
        this.fsUtils.safeUnlink(privFinal),
        this.fsUtils.safeUnlink(pubFinal)
      ]);

      throw new KeyWriteError({ domain, kid, cause: err });
    }
  }


  async loadPrivateKey(domain, kid) {
    try {
      return await readFile(
        this.paths.privateKey(domain, kid),
        "utf8"
      );
    } catch (err) {
      throw new KeyReadError({ domain, kid, cause: err });
    }
  }

  async loadPublicKey(domain, kid) {
    try {
      return await readFile(
        this.paths.publicKey(domain, kid),
        "utf8"
      );
    } catch (err) {
      throw new KeyReadError({ domain, kid, cause: err });
    }
  }

  async deletePrivateKey(domain, kid) {
    try {
      await unlink(this.paths.privateKey(domain, kid));
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw new KeyDeleteError({ domain, kid, cause: err });
      }
    }
  }

  async deletePublicKey(domain, kid) {
    try {
      await unlink(this.paths.publicKey(domain, kid));
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw new KeyDeleteError({ domain, kid, cause: err });
      }
    }
  }

  /** List all private key files (*.pem → kid) */
  async listPrivateKids(domain) {
    await this.#ensureDirs(domain);
    const files = await readdir(this.paths.privateDir(domain));
    return files
      .filter(f => f.endsWith(".pem"))
      .map(f => f.replace(".pem", ""));
  }

  /** List all public key files (*.pem → kid) */
  async listPublicKids(domain) {
    await this.#ensureDirs(domain);
    const files = await readdir(this.paths.publicDir(domain));
    return files
      .filter(f => f.endsWith(".pem"))
      .map(f => f.replace(".pem", ""));
  }

  /** tmp recedue cleanup (clean all .tmp resedue) */
  async #cleanTmpFiles(domain) {
    try {
      const privateFiles = await readdir(this.paths.privateDir(domain));
      const publicFiles = await readdir(this.paths.publicDir(domain));
      const tmpFiles = [...privateFiles, ...publicFiles].filter(f => f.endsWith(".tmp"));

      await Promise.all(
        tmpFiles.map(f =>
          unlink(this.paths.tmpKey(domain, f)).catch(() => { })
        )
      );
      return true;

    } catch (err) {
      // Ignore errors during cleanup
      return false;
    }
  }

  /** clean resdue from all domains*/
  async cleanTmpResidue() {
    // This method would ideally scan all domain directories.
    const baseDir = this.paths.baseDir();
    const domains = await readdir(baseDir);
    await Promise.all(
      domains.map(domain => this.#cleanTmpFiles(domain))
    );
  }
}
