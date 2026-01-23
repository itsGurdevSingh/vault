export class KeyStoreError extends Error {
  constructor({ message, domain, kid, operation, cause }) {
    super(message);
    this.name = this.constructor.name;

    this.domain = domain;
    this.kid = kid;
    this.operation = operation; // write | read | delete | ensure
    this.cause = cause; // original error (optional)
  }
}

export class KeyWriteError extends KeyStoreError {
  constructor({ domain, kid, cause }) {
    super({
      message: `Failed to write key`,
      domain,
      kid,
      operation: "write",
      cause
    });
  }
}

export class KeyReadError extends KeyStoreError {
  constructor({ domain, kid, cause }) {
    super({
      message: `Failed to read key`,
      domain,
      kid,
      operation: "read",
      cause
    });
  }
}

export class KeyDeleteError extends KeyStoreError {
  constructor({ domain, kid, cause }) {
    super({
      message: `Failed to delete key`,
      domain,
      kid,
      operation: "delete",
      cause
    });
  }
}

export class KeyDirectoryError extends KeyStoreError {
  constructor({ domain, cause }) {
    super({
      message: `Failed to ensure key directories`,
      domain,
      kid: null,
      operation: "ensure",
      cause
    });
  }
}
