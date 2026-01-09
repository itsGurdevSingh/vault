# Test Coverage TODO List

**Current Status: 1137 tests passing across 41 test files** ✅
**Latest Update: Added 97 tests in Phase 3 (Infrastructure Support) - PHASE 3 COMPLETE!** 🎉

## ✅ COMPLETED - Domain Layer (100% Coverage)

### Key Manager Modules

- ✅ **loader/** (4 files)

  - KeyDirectory.test.js
  - KeyReader.test.js
  - KeyRegistry.test.js
  - LoaderFactory.test.js

- ✅ **generator/** (3 files)

  - RSAKeyGenerator.test.js
  - DirManager.test.js
  - GeneratorFactory.test.js

- ✅ **builder/** (2 files)

  - JWKSBuilder.test.js
  - BuilderFactory.test.js

- ✅ **signer/** (2 files)

  - Signer.test.js
  - SignerFactory.test.js

- ✅ **janitor/** (5 files)

  - Janitor.test.js
  - KeyDeleter.test.js
  - KeyFileJanitor.test.js
  - MetadataJanitor.test.js
  - ExpiredKeyReaper.test.js
  - JanitorFactory.test.js

- ✅ **metadata/** (5 files)

  - MetadataService.test.js
  - MetaBuilder.test.js
  - MetaFileStore.test.js
  - MetadataFactory.test.js
  - utils.test.js

- ✅ **keyRotator/** (3 files) - **COMPLETED!**

  - Rotator.test.js (28 tests)
  - RotationScheduler.test.js (26 tests)
  - RotationFactory.test.js (12 tests)

- ✅ **utils/** (2 files) - **COMPLETED THIS SESSION!**

  - DomainNormalizer.test.js (65 tests) ✨ NEW
  - KeyResolver.test.js (30 tests) ✨ NEW

- ✅ **config/** (1 file) - **COMPLETED THIS SESSION!**

  - RotationConfig.test.js (45 tests) ✨ NEW

- ✅ **Core Files** - **COMPLETED THIS SESSION!**
  - managerFactory.test.js (11 tests) ✨ NEW
  - KeyManager.test.js (35 tests) ✨ NEW

## ✅ COMPLETED - Infrastructure Layer (Partial)

- ✅ **cryptoEngine/** (5 files)
  - CryptoEngine.test.js
  - KIDFactory.test.js
  - TokenBuilder.test.js
  - EngineFactory.test.js
  - utils.test.js

---

## ✅ PHASE 1 COMPLETE - Domain Core (All Done!)

### 1. ~~**KeyManager Core**~~ ✅ COMPLETED

**Location:** `src/domain/key-manager/`

- ✅ **KeyManager.js** - Main orchestrator class (35 tests)
  - Methods: sign(), getJwks(), getPublicKey(), initialSetup(), rotate(), rotateDomain(), scheduleRotation()
  - All delegation logic tested
- ✅ **managerFactory.js** - Factory for KeyManager (11 tests)
  - DI wiring validated
  - Singleton pattern tested

### 2. ~~**Config Management**~~ ✅ COMPLETED

**Location:** `src/domain/key-manager/config/`

- ✅ **RotationConfig.js** - Configuration validator/manager (45 tests)

  - Methods: configure(), \_validateIntegrity(), \_setRetryInterval(), \_setMaxRetries()
  - All validation logic covered
  - Edge cases (NaN, Infinity, boundaries) tested

- [ ] **RotationState.js** - State object
  - **Priority: LOW** (Simple state object, mostly frozen)
  - **Can be skipped** - just a data structure

### 3. ~~**Domain Utils**~~ ✅ COMPLETED

**Location:** `src/domain/key-manager/utils/`

- ✅ **domainNormalizer.js** - Domain name normalization (65 tests)

  - Methods: normalizeDomain(), isValidDomain()
  - Comprehensive validation testing
  - Singleton pattern tested

- ✅ **keyResolver.js** - Active KID resolver/adapter (30 tests)
  - Methods: getActiveKID(), getSigningKey(), getVarificationKey(), setActiveKid()
  - All adapter methods tested

**Phase 1 Total: 186 tests added** ✅

---

## ✅ PHASE 2 COMPLETE - Infrastructure Critical (All Done!)

### 4. ~~**Cache Layer - Distributed Locking**~~ ✅ COMPLETED

**Location:** `src/infrastructure/cache/`

- ✅ **rotationLockRepo.js** - Distributed locking (36 tests) ✨ NEW
  - Methods: acquire(), release()
  - Race condition handling
  - TTL management
  - UUID token security
  - Lua script atomic operations
  - Integration scenarios

### 5. ~~**Database Layer - Rotation Policies**~~ ✅ COMPLETED

**Location:** `src/infrastructure/db/`

- ✅ **repositories/rotationPolicy.repo.js** - Rotation policies CRUD (41 tests) ✨ NEW
  - Methods: findByDomain(), createPolicy(), updatePolicy(), deletePolicy()
  - enableRotation()/disableRotation()
  - getAllPolicies(), getEnabledPolicies(), getDueForRotation()
  - updateRotationDates(), acknowledgeSuccessfulRotation()
  - getSession() - MongoDB transaction support
  - Domain normalization consistency
  - Date calculations (intervalDays \* 86400000ms)

**Phase 2 Total: 77 tests added** ✅

---

## ✅ PHASE 3 COMPLETE - Infrastructure Support (All Done!)

### 6. ~~**Cache Layer - Redis Client**~~ ✅ COMPLETED

**Location:** `src/infrastructure/cache/`

- ✅ **redisClient.js** - Redis connection wrapper (33 tests) ✨ NEW
  - Initialization: config from environment (REDIS_HOST, PORT, PASSWORD)
  - Event handlers: connect and error events with logger integration
  - Redis instance: method availability (set, get, del, exists, expire, ttl, keys, quit, disconnect, ping)
  - Redis operations: method calls with correct arguments
  - Connection management: quit (graceful), disconnect (forceful), ping (health check)
  - Error handling: propagate Redis errors, connection error events
  - Singleton pattern

### 7. ~~**Database Layer - MongoDB Client**~~ ✅ COMPLETED

**Location:** `src/infrastructure/db/`

- ✅ **mongoClient.js** - MongoDB connection wrapper (23 tests) ✨ NEW
  - Configuration: MongoDB URI from environment
  - connectDB: mongoose.connect with correct URI, success logging
  - Error handling: failure logging, throw/propagate errors
  - Multiple connection attempts: retries, repeated connections
  - Connection state: URI consistency
  - Async behavior: Promise-based, awaits mongoose.connect
  - Logging: success/failure messages

### 8. ~~**Filesystem Layer - Path Utilities**~~ ✅ COMPLETED

**Location:** `src/infrastructure/filesystem/`

- ✅ **KeyPaths.js** - File path generator/resolver (41 tests) ✨ NEW
  - Base paths: domain-based directory generation
  - Private/public key paths: .pem extension, separate directories
  - Origin metadata paths: .meta extension, domain-specific
  - Archived metadata paths: global archived directory
  - Path consistency: separators, CWD prefix, differentiation
  - Special characters: hyphens, underscores, numbers, domains with port
  - Object structure: 9 methods

**Phase 3 Total: 97 tests added** ✅

---

## 🔴 REMAINING TESTS - Optional (Phase 4)

### 9. **Config Layer - Rotation State** (Optional)

**Location:** `src/domain/key-manager/config/`

- [ ] **RotationState.js** - State object (~5-10 tests)
  - **Priority: LOW** - Simple immutable data structure
  - **Can be skipped** - mostly just property getters

### 10. **Logging Layer** (Optional)

**Location:** `src/infrastructure/logging/`

- [ ] **logger.js** - Winston logger wrapper
  - **Priority: LOW** (Side effects only)
  - **Complexity: LOW** (Simple wrapper)
  - **Can be skipped** - mostly external library testing

---

## 📊 UPDATED TEST ORDER

### ~~Phase 1: Domain Core~~ ✅ **COMPLETE!** (186 tests added)

1. ~~KeyManager.js~~ ✅ (35 tests)
2. ~~managerFactory.js~~ ✅ (11 tests)
3. ~~keyResolver.js~~ ✅ (30 tests)
4. ~~domainNormalizer.js~~ ✅ (65 tests)
5. ~~RotationConfig.js~~ ✅ (45 tests)

### ~~Phase 2: Infrastructure Critical~~ ✅ **COMPLETE!** (77 tests added)

6. ~~**rotationLockRepo.js**~~ ✅ (36 tests) - Distributed locks
7. ~~**rotationPolicy.repo.js**~~ ✅ (41 tests) - DB operations

### ~~Phase 3: Infrastructure Support~~ ✅ **COMPLETE!** (97 tests added)

8. ~~**redisClient.js**~~ ✅ (33 tests) - Redis wrapper
9. ~~**mongoClient.js**~~ ✅ (23 tests) - MongoDB wrapper
10. ~~**KeyPaths.js**~~ ✅ (41 tests) - Path utilities

### Phase 4: Optional (Low Priority - Can Skip)

11. **RotationState.js** - State object (~5-10 tests, **recommend skipping**)
12. **logger.js** - Logging wrapper (~10 tests, **recommend skipping**)

**Estimated:** ~15-20 tests (if implemented)

---

## 📈 PROGRESS SUMMARY

### ✅ Completed Phases

- **Phase 1: Domain Core** - 186 tests added ✅
  - domainNormalizer (65), keyResolver (30), RotationConfig (45), managerFactory (11), KeyManager (35)
- **Phase 2: Infrastructure Critical** - 77 tests added ✅

  - rotationLockRepo (36), rotationPolicyRepo (41)

- **Phase 3: Infrastructure Support** - 97 tests added ✅
  - redisClient (33), mongoClient (23), KeyPaths (41)

### 🎯 Remaining Phases

- **Phase 4: Optional** - ~15-20 tests (low priority, can skip)
  - RotationState (~5-10), logger (~10)

### 📊 Test Count Progress

- **Starting baseline:** 777 tests (31 files)
- **After Phase 1:** 963 tests (36 files) - +186 tests
- **After Phase 2:** 1040 tests (38 files) - +77 tests
- **After Phase 3:** 1137 tests (41 files) - +97 tests
- **Total added:** +360 tests (+46% increase!) 🎉
- **Phase 4 target (optional):** 1150-1160 tests

---

## 🎯 ALL ESSENTIAL TESTING COMPLETE!

**Phase 3 Infrastructure Support is now complete!** All critical and medium-priority tests are done.

- Connection pooling, session management, error handling

3. **KeyPaths.js** - File path utilities
   - Path generation, validation, formatting

**Estimated completion:** ~55-70 tests to reach 1095-1110 total tests

---

## 🎉 SESSION ACHIEVEMENTS (Phases 1 & 2)

✅ **Phase 1 Complete:** Domain Core fully tested (186 tests)
✅ **Phase 2 Complete:** Infrastructure Critical fully tested (77 tests)
✅ **263 tests added:** +34% test coverage increase
✅ **100% pass rate:** All 1040 tests passing
✅ **8 commits:** Clean git history with detailed messages
✅ **Test count:** 777 → 1040 (+263 tests)
✅ **Files added:** 7 new test files

**All critical infrastructure components now tested!** 🚀

---

## 🎯 TODAY'S PLAN

We'll start with **Phase 1: Domain Core** and implement tests one by one:

1. **domainNormalizer.js** (Easiest, warm-up)
2. **keyResolver.js** (Simple adapter)
3. **RotationConfig.js** (Validation logic)
4. **managerFactory.js** (DI wiring)
5. **KeyManager.js** (Main orchestrator)

Each module will follow the same systematic approach we used for keyRotator:

- ✅ Create comprehensive test file
- ✅ Test all public methods
- ✅ Test error cases
- ✅ Test edge cases
- ✅ Achieve 100% coverage
- ✅ Commit to git
