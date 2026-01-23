import { mkdir, writeFile, readFile, unlink } from "fs/promises";

import {
  KeyWriteError,
  KeyReadError,
  KeyDeleteError,
  KeyDirectoryError
} from "./errors.js";
import { KeyStorePort } from "../../application/ports/KeyStorePort.js";

export class FileSystemKeyStore extends KeyStorePort {
  constructor({ pathResolver }) {
    this.paths = pathResolver;
  }

  async #ensureDirs(domain) {
    try {
      await mkdir(this.paths.privateDir(domain), { recursive: true });
      await mkdir(this.paths.publicDir(domain), { recursive: true });
    } catch (err) {
      throw new KeyDirectoryError({ domain, cause: err });
    }
  }

  async saveKeyPair(domain, kid, { publicKey, privateKey }) {
    await this.#ensureDirs(domain);

    try {
      await writeFile(
        this.paths.privateKey(domain, kid),
        privateKey,
        { mode: 0o600 }
      );
      await writeFile(
        this.paths.publicKey(domain, kid),
        publicKey,
        { mode: 0o644 }
      );
    } catch (err) {
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
}
