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

### 3. Key Rotation Flow (11 tests)

**File:** `tests/integration/rotation-flow.test.js`  
**Functionality:** Atomic key rotation with rollback, distributed locking, and multi-domain isolation

**What's Tested:**

- Complete rotation cycle (prepare → commit → cleanup)
- State transitions with #upcomingKid and #previousKid tracking
- Rollback mechanism on DB transaction failure
- File cleanup on rollback (upcoming keys deleted)
- Distributed locking (prevents concurrent rotation)
- Lock release after success/failure
- Multi-domain isolation (independent rotation)
- Parallel rotation of different domains
- Error handling (no active KID, invalid domain)
- Old private key deletion after commit
- Metadata archival with expiry dates

**Real Dependencies:**

- ✅ node:crypto (real RSA key generation)
- ✅ fs/promises (real file operations)
- ✅ Rotator (real - orchestrator)
- ✅ Janitor facade (KeyFileJanitor + MetadataJanitor)
- ✅ KeyPairGenerator, KeyResolver, MetadataService
- ✅ MockLockRepo (in-memory Redis simulation)
- ✅ MockSession (DB transaction simulation)

**Test Count:** 11 tests (5 test suites)

**Bugs Fixed:**

- ✅ KeyResolver.getActiveKID → getActiveKid: Fixed method name inconsistency (Rotator was calling lowercase version but KeyResolver had uppercase)
- ✅ Added backward-compatible alias getActiveKID() for existing code
- ✅ Fixed internal KeyResolver calls to use consistent lowercase convention

**Design Patterns Validated:**

- ✅ Facade Pattern: Rotator → Janitor → KeyFileJanitor/MetadataJanitor → KeyDeleter
- ✅ Atomic Operations: Prepare-Commit-Rollback pattern
- ✅ Distributed Locking: Redis-based coordination

---

### 4. Janitor Cleanup Flow (15 tests)

**File:** `tests/integration/janitor-flow.test.js`  
**Functionality:** Key file deletion, metadata cleanup, expired key reaping with cache invalidation

**What's Tested:**

- Private key deletion with cache invalidation (loaderCache.private, signerCache)
- Public key deletion with cache invalidation (loaderCache.public, builderCache)
- Graceful handling of non-existent file deletion
- Metadata expiry addition (archived metadata creation)
- Origin metadata deletion
- Archived metadata deletion  
- Expired key reaper (multi-domain cleanup)
- Grace period enforcement (KEY_PUBLIC_TTL_MS + KEY_GRACE_MS)
- Selective cleanup (expired vs non-expired keys)
- Multi-domain isolation (independent cleanup per domain)
- Cache invalidation per KID (not per domain)
- Error handling (missing files, partial cleanup failures)

**Real Dependencies:**

- ✅ node:fs/promises (real file operations)
- ✅ Janitor facade (KeyFileJanitor + MetadataJanitor)
- ✅ ExpiredKeyReaper (real - scheduled cleanup)
- ✅ KeyDeleter (real filesystem deletion)
- ✅ MetadataService + MetaFileStore (real)
- ✅ Cache instances (real invalidation logic)

**Test Count:** 15 tests (5 test suites)

**Bugs Fixed:**

- ✅ ExpiredKeyReaper: Fixed `metadataManager` undefined → changed to `this.metadataJanitor.metadataManager`
- ✅ ExpiredKeyReaper receives MetadataJanitor (facade), not MetadataService directly

**Design Patterns Validated:**

- ✅ Facade Pattern: Janitor → KeyFileJanitor + MetadataJanitor → KeyDeleter
- ✅ Cache Invalidation: Delete filesystem first, then invalidate caches
- ✅ Error Resilience: Continue cleanup even if individual deletions fail

---

## 🎯 Priority 1 Complete! (56 tests)

**Summary:**
- ✅ Key Lifecycle: 15 tests
- ✅ JWT Signing & Verification: 15 tests  
- ✅ Key Rotation Flow: 11 tests
- ✅ Janitor Cleanup Flow: 15 tests

**Total:** 56 integration tests passing (100% pass rate)

---

## 📋 Next Steps (Priority 2 - Optional)

### 5. Builder (JWKS Generation) Flow (~8-10 tests)

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
