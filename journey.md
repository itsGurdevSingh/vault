# Project Journey

This document captures the evolution of the Vault Service project — major architectural decisions, reasoning behind them, and the incremental steps taken from concept to implementation.

It serves as a transparent record of how the system was built, why certain choices were made, and how the project matured over time.

---

## 1. Initial Foundation

* Set up the base project structure.
* Defined module boundaries and initial folder layout.
* Aligned on goals: secure key management, domain‑scoped operations, and predictable key lifecycle.

---

## 2. RSA Key Generation

* Implemented RSA keypair generator.
* Standardized output format and internal KID creation.
* Added domain-aware key generation paths.

---

## 3. Key Loading Logic

* Built key loader supporting structured domain directories.
* Added validation and parsing rules.
* Established separation between public, private, and metadata concerns.

---

## 4. Domain-Based Refactor

* Moved from global generator to domain-isolated generators.
* Integrated private KID generation.
* Cleaned and simplified architecture around domain context.

---

## 5. Metadata System

* Introduced `.meta` files storing metadata in JSON format.
* Added fields like `createdAt`, `expiresAt`, and other operational info.
* Decoupled metadata from actual key storage for clarity.

---

## 6. Centralized Path Manager

* Created unified path resolver for all key locations.
* Ensured clean separation of origin paths, archive paths, and domain-specific directories.
* Eliminated hardcoded strings across the codebase.

---

## 7. Promise-Based FIFO Locking (Race-Free Rotation)

* Added per-domain async locking using a FIFO queue pattern.
* Prevented overlapping key rotations.
* Guaranteed deterministic ordering of operations.

---

## 8. Full Key Rotation System

* Designed and implemented a standard rotation flow.
* Integrated metadata updates when marking keys for expiration.
* Wrote expiring metadata directly to the archive.
* Ensured JWKS remains clean and independent from metadata operations.

---

## 9. Janitor System (Cleanup Automation)

* Added scheduled cleanup for expired keys.
* Janitor operates exclusively on the archive, simplifying logic.
* Deletes expired private keys and corresponding public keys.
* Fully integrated with the metadata manager.

---

## 10. Architectural Alignment & Cleanup

* Standardized archive structure and domain-specific flows.
* Unified generator, loader, janitor, and JWKS builder under shared metadata manager logic.
* Reduced coupling and simplified future enhancements.

---

*This document will continue to grow as the project evolves — capturing major upgrades, design debates, refactors, and key architectural leaps.*
