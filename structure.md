 *Architecture / Project Structure*.

# 📦 **Vault Service – Project Architecture**

This document explains the production-grade structure of the Vault Service codebase.
Each directory is organized using **Domain-Driven Design**, **Clean Architecture**, and **Separation of Concerns** principles.
The goal: keep **business logic pure**, **infrastructure replaceable**, and **APIs thin + consistent**.

---

# 🗂️ **Project Structure Overview**

```
src/
├── app.js
├── server.js
│
├── config/
├── domain/
├── infrastructure/
├── transport/
├── utils/
└── tests/
```

Each layer has a **single responsibility** and communicates with others through well-defined interfaces.

---

# ⚙️ **config/**

Centralized configuration used across the service.

### Files

| File                | Responsibility                                                   |
| ------------------- | ---------------------------------------------------------------- |
| `envConfig.js`      | Loads and validates environment variables.                       |
| `keys.js`           | Global key management settings (paths, algorithms).              |
| `rotationConfig.js` | Developer-defined rotation limits (retry bounds, TTL, defaults). |

Configs contain **no logic**, only values.

---

# 🧠 **domain/**

Pure business logic — absolutely **no Redis, no DB, no HTTP** inside.

This contains your core Vault functionality.

### Modules

---

## **key-manager/**

Handles the **entire lifecycle of cryptographic keys**.

Includes:

* Key rotation (prepare → commit → rollback)
* Active KID management
* Upcoming / previous KID transitions
* Coordination with KeyLoader + Janitor

Files:

| File            | Responsibility                                          |
| --------------- | ------------------------------------------------------- |
| `KeyManager.js` | Orchestrates generation, rotation, rollback, commit.    |
| `KeyLoader.js`  | Reads active keys + public keys from filesystem.        |
| `KeyJanitor.js` | Deletes expired keys, archive cleanup, TTL enforcement. |
| `index.js`      | Re-exports module.                                      |

---

## **metadata-manager/**

Owns the lifecycle of metadata (origin and archived).

| File                 | Responsibility                                                           |
| -------------------- | ------------------------------------------------------------------------ |
| `MetadataManager.js` | Writes origin metadata, archived metadata, restores or deletes metadata. |
| `index.js`           | Re-export.                                                               |

---

## **rotation-manager/**

Coordinates scheduled and manual rotation across all domains.

| File                 | Responsibility                                       |
| -------------------- | ---------------------------------------------------- |
| `RotationManager.js` | Retry logic, distributed locking, summary reporting. |
| `index.js`           | Re-export.                                           |

---

## **signer/**

Responsible for **JWT signing only**, using the active private key.

| File        | Responsibility                                                   |
| ----------- | ---------------------------------------------------------------- |
| `Signer.js` | Builds JWT header/payload, imports PKCS8 key, signs RS256 token. |
| `index.js`  | Re-export.                                                       |

---

# 🏗️ **infrastructure/**

Everything that talks to the *outside world*: DB, Redis, filesystem, logging, crypto helpers.
This layer **depends on nothing inside domain**, keeping the system clean.

---

## **crypto/**

Low-level cryptographic utilities.

| File              | Responsibility                                         |
| ----------------- | ------------------------------------------------------ |
| `crypto-utils.js` | Base64URL encode, PEM conversion, ArrayBuffer helpers. |
| `jwt.js`          | Header/payload construction for signed tokens.         |
| `index.js`        | Re-export.                                             |

---

## **db/**

MongoDB integration layer.

| File                                  | Responsibility                   |
| ------------------------------------- | -------------------------------- |
| `mongoClient.js`                      | MongoDB connection + lifecycle.  |
| `models/RotationPolicy.model.js`      | Domain rotation policy schema.   |
| `repositories/rotationPolicy.repo.js` | Get/update rotation policy data. |
| `index.js`                            | Re-export.                       |

---

## **cache/**

Redis client + distributed locking.

| File                  | Responsibility                        |
| --------------------- | ------------------------------------- |
| `redisClient.js`      | Initializes Redis (health, logging).  |
| `rotationLockRepo.js` | Domain-specific locking for rotation. |
| `index.js`            | Re-export.                            |

---

## **filesystem/**

All key and metadata storage.

| File            | Responsibility                              |
| --------------- | ------------------------------------------- |
| `KeyPaths.js`   | Path generation for each domain + key type. |
| `KeyStorage.js` | Atomic reads/writes/delete operations.      |
| `index.js`      | Re-export.                                  |

---

## **logging/**

System-wide logger.

| File        | Responsibility                            |
| ----------- | ----------------------------------------- |
| `logger.js` | Winston/Pino wrapper for structured logs. |
| `index.js`  | Re-export.                                |

---

# 🌐 **transport/**

Contains only IO-level concerns (HTTP + GRPC).
Zero business logic.

---

## **http/**

| File           | Responsibility                                                |
| -------------- | ------------------------------------------------------------- |
| `controllers/` | Accepts requests → calls domain services → returns responses. |
| `routes/`      | Defines REST endpoints + attaches controllers.                |
| `index.js`     | Mounts routers onto the app.                                  |

---

## **grpc/**

| File        | Responsibility                                 |
| ----------- | ---------------------------------------------- |
| `proto/`    | .proto definitions for Vault API.              |
| `server.js` | GRPC server handlers calling domain functions. |
| `client.js` | Optional GRPC client for external calls.       |

---

# 🧩 **utils/**

Generic helpers used anywhere.

| File          | Responsibility                |
| ------------- | ----------------------------- |
| `time.js`     | TTL math, expiration helpers. |
| `validate.js` | Reusable validation helpers.  |
| `index.js`    | Re-export.                    |

---

# 🧪 **tests/**

Full production-grade test suite.

| Directory      | Responsibility                                      |
| -------------- | --------------------------------------------------- |
| `unit/`        | Tests pure logic (no DB/Redis/FS).                  |
| `integration/` | Tests combined flows (rotation, signing, metadata). |
| `fixtures/`    | Sample keys, metadata JSON, mock FS files.          |

---

# 🚀 Summary

This architecture ensures that:

* Domain logic is **clean and deterministic**
* Infrastructure (DB/Redis/FS) is **completely replaceable**
* Testing is trivial because layers are separated
* Services scale horizontally safely (distributed locking + stateless design)
* Crypto operations remain isolated and reusable


