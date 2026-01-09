# Integration Test Coverage Summary

**Purpose:** Track integration tests that verify component interactions with real dependencies (filesystem, crypto).

**Status:** In Progress - Priority 1 Critical Flows

---

## ✅ Completed Integration Tests

### 1. Key Lifecycle (10 tests)

**File:** `tests/integration/key-lifecycle.test.js`  
**Functionality:** Generate → Store → Retrieve flow with real filesystem and crypto

**Domain Context:** In this system, "domain" refers to token signing contexts:

- **USER** - For signing tokens for end users
- **SERVICE** - For inter-service communication tokens
- **TEST** - For testing purposes

**What's Tested:**

- RSA key pair generation (4096-bit) using node:crypto
- Filesystem storage (private/public keys, metadata)
- Directory structure auto-creation (private/, public/, metadata/)
- Key retrieval with caching
- Multi-domain isolation (USER, SERVICE, TEST)
- Multiple keys per domain
- Concurrent key generation
- PEM format validation
- Metadata file structure

**Real Dependencies:**

- ✅ node:crypto (real RSA key generation)
- ✅ fs/promises (real file I/O)
- ✅ CryptoEngine (real)
- ✅ KeyWriter (real)
- ✅ KeyReader (real)
- ✅ MetadataService (real)

**Test Count:** 15 test suites, ~45+ assertions

**Design Constraints:**

- ✅ **KID Structure**: Format is strict: `{domain}-{YYYYMMDD}-{HHMMSS}-{HEX}`
- ✅ **Domain Names**: Must NOT contain hyphens or special characters (e.g., USER, SERVICE, TEST are valid; USER-ADMIN is invalid)
- ✅ This constraint is enforced by KIDFactory.getInfo() which splits by `-` and takes first part as domain

**Flaws/Issues:** None detected

---

### 2. JWT Signing & Verification Flow (15 tests)

**File:** `tests/integration/signing-flow.test.js`  
**Functionality:** Complete JWT signing, verification, and JWKS generation with real crypto

**What's Tested:**

- JWT signing with payload, custom TTL, and additional claims
- JWT structure validation (header, payload, signature)
- Signature verification with correct/wrong public keys
- Tampered payload detection
- JWKS endpoint response format (RFC 7517)
- JWT verification using JWKS public key
- Multi-domain signing isolation
- Error handling (invalid domain, payload, TTL, missing active KID)

**Real Dependencies:**

- ✅ node:crypto (real RSA signing/verification)
- ✅ fs/promises (real key file I/O)
- ✅ Signer (real)
- ✅ Builder (JWKS) (real)
- ✅ KeyResolver (real)
- ✅ ActiveKIDState (real)
- ✅ TokenBuilder (real)

**Test Count:** 15 tests (4 test suites)

**Bugs Fixed:**

- ✅ ActiveKIDState.js: Fixed import path for Cache (`../utils/cache.js` not `../../utils/cache.js`)
- ✅ KeyResolver.getActiveKID(): Now correctly passes `domain` parameter to kidStore.getActiveKid(domain)

---

## 🔄 In Progress

### 3. Key Rotation Flow (~15-20 tests)

---

## 📋 Remaining (Priority 1)

### 3. Key Rotation Flow (~15-20 tests)

- Complete rotation cycle with state transitions
- Rollback mechanisms
- Distributed locking
- Database transaction coordination

### 4. Janitor Cleanup Operations (~10-12 tests)

- Expired key deletion
- Metadata archival
- Grace period handling

---

## 📊 Progress

**Completed:** 2/4 Priority 1 tests (50%)  
**Test Count:** ~30 tests  
**Estimated Remaining:** ~25-32 tests

---

## 🎯 Next Steps

1. JWT Signing & Verification Flow
2. Key Rotation Flow
3. Janitor Cleanup Operations
