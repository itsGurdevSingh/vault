# Integration Test Plan

**Status:** Planning Phase - No integration tests implemented yet
**Unit Tests Completed:** 1137 tests across 41 files ✅
**Next Phase:** Integration Testing

---

## 🎯 Integration Test Strategy

Integration tests will verify that multiple components work correctly together, testing real interactions between:

- Domain layer ↔ Infrastructure layer
- File system operations with actual files
- Database + Cache coordination
- End-to-end workflows

**Approach:** Use real dependencies where possible, mock only external services (Redis, MongoDB)

---

## 📋 INTEGRATION TEST CHECKLIST

### **Priority 1: Critical Flows** (MUST HAVE)

#### 1. **End-to-End Key Rotation Flow** (~15-20 tests)

**File:** `tests/integration/key-rotation-flow.test.js`

**What to test:**

- ✅ Complete rotation cycle: generate → store → update metadata → set active KID
- ✅ Multi-step rollback on failure (cleanup files, restore state)
- ✅ Distributed lock prevents concurrent rotation
- ✅ Database transaction commits on success
- ✅ Filesystem cleanup after rotation (old keys archived)
- ✅ Active KID transitions correctly (previous → upcoming → active)
- ✅ Metadata reflects correct rotation timeline
- ✅ JWKS updates with new key

**Real dependencies:**

- Actual filesystem operations (create/read/delete PEM files)
- Real metadata JSON files
- Mock Redis (for locking)
- Mock MongoDB (for policy tracking)

**Key scenarios:**

1. Successful rotation: Generate key → Store → Activate → Verify
2. Failure during generation → Rollback triggered
3. Failure during commit → Rollback deletes upcoming key
4. Concurrent rotation attempts → Second blocked by lock
5. Multi-domain rotation → Independent per domain
6. Verify old key archived after rotation

---

#### 2. **Key Generation → Storage → Retrieval Flow** (~10-12 tests)

**File:** `tests/integration/key-lifecycle.test.js`

**What to test:**

- ✅ Generate RSA key pair → Store to filesystem
- ✅ Read private key back from disk
- ✅ Read public key back from disk
- ✅ Metadata file created with correct structure
- ✅ Directory structure created automatically
- ✅ File permissions correct (if applicable)
- ✅ Multiple keys per domain stored correctly
- ✅ Keys retrievable by KID

**Real dependencies:**

- Actual RSA key generation (node:crypto)
- Real filesystem (storage/keys directory)
- Real metadata files (storage/metadata)

**Key scenarios:**

1. Generate → Store → Retrieve → Verify key matches
2. Multiple domains → Separate directories
3. Multiple keys per domain → All accessible
4. Metadata consistency check

---

#### 3. **JWT Signing & Verification Flow** (~8-10 tests)

**File:** `tests/integration/signing-flow.test.js`

**What to test:**

- ✅ Generate key → Sign JWT → Verify JWT
- ✅ JWKS endpoint returns correct public key
- ✅ Multiple domains have separate keys
- ✅ Signature validation with correct public key
- ✅ Signature fails with wrong key
- ✅ Signing with cached vs fresh key
- ✅ Algorithm consistency (RS256)

**Real dependencies:**

- Real key generation
- Real filesystem for key storage
- Real crypto signing/verification

**Key scenarios:**

1. Sign with new key → Verify passes
2. Sign → Get JWKS → Verify with JWKS key
3. Wrong domain JWKS → Verification fails
4. Multiple concurrent signs → All succeed

---

#### 4. **Janitor Cleanup Operations** (~10-12 tests)

**File:** `tests/integration/janitor-cleanup.test.js`

**What to test:**

- ✅ Expired keys deleted from filesystem
- ✅ Expired metadata files deleted
- ✅ Metadata archived correctly
- ✅ Active keys never deleted
- ✅ Grace period respected
- ✅ Multiple domains cleaned independently
- ✅ Partial failures handled gracefully
- ✅ Dry run mode (preview without deleting)

**Real dependencies:**

- Real filesystem with test keys
- Actual file deletion
- Real metadata files

**Key scenarios:**

1. Create expired keys → Run janitor → Verify deleted
2. Mix of active + expired → Only expired removed
3. Metadata archival → Files moved correctly
4. Grace period not yet passed → Keys preserved
5. Multi-domain cleanup → Independent operations

---

### **Priority 2: Component Integration** (SHOULD HAVE)

#### 5. **Database + Cache Coordination** (~8-10 tests)

**File:** `tests/integration/db-cache-coordination.test.js`

**What to test:**

- ✅ Acquire lock → Update policy → Release lock
- ✅ Lock prevents concurrent policy updates
- ✅ Transaction rollback clears lock
- ✅ Lock TTL expires if process crashes
- ✅ Policy queries during locked state
- ✅ Session management with transactions

**Mock dependencies:**

- Mock Redis for locking
- Mock MongoDB for policies

**Key scenarios:**

1. Lock → Transaction → Commit → Unlock
2. Lock → Transaction fails → Rollback → Unlock
3. Lock held → Second attempt blocked
4. Lock expires → Reacquirable

---

#### 6. **Multi-Domain Key Management** (~10-12 tests)

**File:** `tests/integration/multi-domain.test.js`

**What to test:**

- ✅ Setup multiple domains (domain1.com, domain2.com)
- ✅ Each domain has independent keys
- ✅ Rotation in one domain doesn't affect others
- ✅ JWKS per domain correct
- ✅ Signing with domain-specific keys
- ✅ Janitor cleans per domain
- ✅ Cross-domain isolation verified

**Real dependencies:**

- Real filesystem (separate directories)
- Real key generation per domain

**Key scenarios:**

1. Setup 3 domains → Verify isolation
2. Rotate domain1 → domain2/3 unchanged
3. Sign with domain1 key → Verify with domain1 JWKS
4. Clean domain2 → domain1/3 unaffected

---

#### 7. **Initial Domain Setup Flow** (~6-8 tests)

**File:** `tests/integration/domain-setup.test.js`

**What to test:**

- ✅ New domain initialization
- ✅ First key generation
- ✅ Directory structure created
- ✅ Metadata initialized
- ✅ Active KID set
- ✅ JWKS available immediately
- ✅ Ready to sign after setup

**Real dependencies:**

- Real filesystem
- Real key generation

**Key scenarios:**

1. Fresh domain → Setup → Verify ready
2. Parallel domain setups → No conflicts
3. Restart after setup → State persists

---

#### 8. **Scheduled Rotation with Policies** (~8-10 tests)

**File:** `tests/integration/scheduled-rotation.test.js`

**What to test:**

- ✅ Fetch due policies from database
- ✅ Rotate only due domains
- ✅ Update nextRotationAt after success
- ✅ Retry failed rotations
- ✅ Skip disabled domains
- ✅ Handle partial failures (some succeed, some fail)
- ✅ Rotation summary accurate

**Mock dependencies:**

- Mock MongoDB for policies

**Real dependencies:**

- Real rotation operations
- Real filesystem

**Key scenarios:**

1. 3 policies due → All rotated → nextRotationAt updated
2. 1 fails → Retries → Eventually succeeds
3. Mix of due + not due → Only due rotated
4. Disabled domain → Skipped

---

### **Priority 3: Error Recovery & Edge Cases** (NICE TO HAVE)

#### 9. **Error Recovery Scenarios** (~8-10 tests)

**File:** `tests/integration/error-recovery.test.js`

**What to test:**

- ✅ Filesystem full → Graceful failure
- ✅ Corrupt key file → Recovery
- ✅ Missing metadata → Regenerate
- ✅ Lock acquisition timeout → Retry
- ✅ Database connection lost → Retry
- ✅ Partial file write → Cleanup

**Real dependencies:**

- Real filesystem with error conditions
- Mock failures

**Key scenarios:**

1. Disk full → Rotation fails → Cleaned up
2. Corrupt file → Detected → Handled
3. Missing metadata → Recreated

---

#### 10. **JWKS Endpoint Integration** (~6-8 tests)

**File:** `tests/integration/jwks-endpoint.test.js`

**What to test:**

- ✅ GET /jwks/:domain returns correct keys
- ✅ Only active + upcoming keys included
- ✅ Expired keys excluded
- ✅ Format matches JWKS spec
- ✅ Cache headers correct
- ✅ Multiple concurrent requests handled

**Real dependencies:**

- Real key loading
- Real JWKS builder

**Key scenarios:**

1. Request JWKS → Returns valid JSON
2. After rotation → JWKS updated
3. Invalid domain → 404
4. Concurrent requests → All succeed

---

## 📊 INTEGRATION TEST SUMMARY

### Test Count Estimates:

- **Priority 1 (Critical Flows):** ~53-64 tests
- **Priority 2 (Component Integration):** ~32-40 tests
- **Priority 3 (Error Recovery):** ~14-18 tests
- **TOTAL:** ~99-122 integration tests

### File Organization:

```
tests/integration/
├── key-rotation-flow.test.js       (15-20 tests) ⭐ CRITICAL
├── key-lifecycle.test.js           (10-12 tests) ⭐ CRITICAL
├── signing-flow.test.js            (8-10 tests)  ⭐ CRITICAL
├── janitor-cleanup.test.js         (10-12 tests) ⭐ CRITICAL
├── db-cache-coordination.test.js   (8-10 tests)
├── multi-domain.test.js            (10-12 tests)
├── domain-setup.test.js            (6-8 tests)
├── scheduled-rotation.test.js      (8-10 tests)
├── error-recovery.test.js          (8-10 tests)
└── jwks-endpoint.test.js           (6-8 tests)
```

### Testing Approach:

**Setup:**

- Create test-specific directories (e.g., `storage-test/`)
- Use in-memory Redis mock for locking
- Use in-memory MongoDB mock for policies
- Cleanup test files after each test

**Execution:**

- Run integration tests separately from unit tests
- Use longer timeouts (e.g., 10s per test)
- Run in sequence (not parallel) to avoid conflicts
- Clean state between tests

**Mocking Strategy:**

- ✅ Mock: Redis, MongoDB, external APIs
- ✅ Real: Filesystem, crypto, key generation, file I/O
- ✅ Real: Domain logic, workflows, state transitions

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Core Flows (Start Here) ⭐

1. **key-lifecycle.test.js** - Simplest, foundation for others
2. **signing-flow.test.js** - Build on lifecycle
3. **key-rotation-flow.test.js** - Most complex but critical
4. **janitor-cleanup.test.js** - Independent, valuable

**Estimated:** ~43-54 tests, ~2-3 days

### Phase 2: Integration Points

5. **db-cache-coordination.test.js** - Database + cache
6. **multi-domain.test.js** - Verify isolation
7. **domain-setup.test.js** - Initial setup
8. **scheduled-rotation.test.js** - Scheduler integration

**Estimated:** ~32-40 tests, ~1-2 days

### Phase 3: Edge Cases (Optional)

9. **error-recovery.test.js** - Error scenarios
10. **jwks-endpoint.test.js** - HTTP endpoint

**Estimated:** ~14-18 tests, ~1 day

---

## 🔧 TEST INFRASTRUCTURE NEEDED

### Before Starting Integration Tests:

1. **Test Helpers** (`tests/integration/helpers/`)

   - `setupTestEnvironment.js` - Create test directories
   - `cleanupTestFiles.js` - Remove test artifacts
   - `mockRedis.js` - In-memory Redis mock
   - `mockMongo.js` - In-memory MongoDB mock
   - `testDomains.js` - Test domain constants

2. **Fixtures** (`tests/integration/fixtures/`)

   - Sample key pairs
   - Sample metadata files
   - Sample policies
   - Sample JWKS responses

3. **Configuration**
   - Separate test config (test database, test storage paths)
   - Environment variables for test mode
   - Vitest config for integration tests

---

## 💡 KEY DIFFERENCES: Unit vs Integration Tests

| Aspect           | Unit Tests (Done ✅)  | Integration Tests (Next)   |
| ---------------- | --------------------- | -------------------------- |
| **Scope**        | Single function/class | Multiple components        |
| **Dependencies** | All mocked            | Real filesystem, crypto    |
| **Speed**        | Fast (~15s total)     | Slower (~60-120s)          |
| **State**        | Stateless             | Stateful (files, DB)       |
| **Isolation**    | Complete              | Partial (shared resources) |
| **Purpose**      | Logic correctness     | Component interaction      |
| **Cleanup**      | Not needed            | Critical (files, DB)       |

---

## ✅ DECISION POINTS

### Should you write integration tests?

**YES, if:**

- ✅ You want to verify end-to-end workflows work
- ✅ You're preparing for production deployment
- ✅ You need confidence in component interactions
- ✅ You want to catch filesystem/DB integration bugs
- ✅ You have time for ~100 additional tests

**SKIP/DEFER, if:**

- ❌ Unit tests already give you confidence
- ❌ Time-constrained (unit tests cover most logic)
- ❌ You'll test manually in staging environment
- ❌ The system is simple enough to reason about

### My Recommendation:

**Implement Priority 1 (Core Flows) only** - ~43-54 critical tests

- Most valuable: key-rotation-flow, signing-flow, janitor-cleanup
- High ROI: Catches real-world issues
- Manageable scope: ~2-3 days of work

Skip Priority 2 & 3 unless you're aiming for production-grade system.

---

## 🚀 NEXT STEPS

If you decide to proceed with integration tests:

1. **Create test infrastructure** (helpers, fixtures, config)
2. **Start with key-lifecycle.test.js** (simplest)
3. **Move to signing-flow.test.js** (builds on lifecycle)
4. **Tackle key-rotation-flow.test.js** (most complex but critical)
5. **Finish with janitor-cleanup.test.js** (independent)

Each test file should follow the same pattern:

- `beforeAll` - Setup test environment
- `afterAll` - Cleanup test files
- `beforeEach` - Reset state
- Tests organized by scenario

---

**Total Project Status:**

- ✅ Unit Tests: 1137 tests (COMPLETE)
- 🔄 Integration Tests: 0 tests (PLANNING)
- 🎯 Recommended: ~43-54 integration tests (Priority 1 only)
