export class SignerError extends Error { }
export class MissingKeyError extends SignerError { }
export class CryptoImportError extends SignerError { }
export class SigningFailedError extends SignerError { }
export class ValidationError extends SignerError { }
export class PayloadTooLargeError extends ValidationError { }
