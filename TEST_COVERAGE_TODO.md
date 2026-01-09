# Test Coverage TODO List

**Current Status: 777 tests passing across 31 test files** ✅

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

- ✅ **keyRotator/** (3 files) - **JUST COMPLETED!**
  - Rotator.test.js (28 tests)
  - RotationScheduler.test.js (26 tests)
  - RotationFactory.test.js (12 tests)

## ✅ COMPLETED - Infrastructure Layer (Partial)

- ✅ **cryptoEngine/** (5 files)
  - CryptoEngine.test.js
  - KIDFactory.test.js
  - TokenBuilder.test.js
  - EngineFactory.test.js
  - utils.test.js

---

## 🔴 MISSING TESTS - Domain Layer

### 1. **KeyManager Core** (High Priority)

**Location:** `src/domain/key-manager/`

- [ ] **KeyManager.js** - Main orchestrator class

  - Methods: sign(), getJwks(), getPublicKey(), initialSetup(), rotate(), scheduleRotation(), cleanup()
  - **Priority: HIGH** (Core business logic)
  - **Complexity: MEDIUM** (8 methods, all delegation)

- [ ] **managerFactory.js** - Factory for KeyManager
  - Creates and wires all dependencies
  - **Priority: HIGH** (DI/wiring validation)
  - **Complexity: LOW** (Simple factory)

### 2. **Config Management** (Medium Priority)

**Location:** `src/domain/key-manager/config/`

- [ ] **RotationConfig.js** - Configuration validator/manager

  - Methods: configure(), \_validateIntegrity(), \_setRetryInterval(), \_setMaxRetries()
  - **Priority: MEDIUM** (Validation logic)
  - **Complexity: LOW-MEDIUM** (Validation + bounds checking)

- [ ] **RotationState.js** - State object
  - **Priority: LOW** (Simple state object, mostly frozen)
  - **Complexity: VERY LOW** (May not need dedicated tests)

### 3. **Domain Utils** (Medium Priority)

**Location:** `src/domain/key-manager/utils/`

- [ ] **domainNormalizer.js** - Domain name normalization

  - Methods: normalizeDomain(), isValidDomain(), getDomainParts()
  - **Priority: MEDIUM** (String processing logic)
  - **Complexity: LOW** (Simple string utilities)

- [ ] **keyResolver.js** - Active KID resolver/adapter
  - Methods: getActiveKID(), getSigningKey(), getVarificationKey(), setActiveKid()
  - **Priority: MEDIUM** (Bridge between components)
  - **Complexity: LOW** (Thin adapter layer)

---

## 🔴 MISSING TESTS - Infrastructure Layer

### 4. **Cache Layer** (High Priority)

**Location:** `src/infrastructure/cache/`

- [ ] **redisClient.js** - Redis connection/operations

  - **Priority: HIGH** (External dependency)
  - **Complexity: MEDIUM** (I/O, connection management)

- [ ] **rotationLockRepo.js** - Distributed locking
  - Methods: acquire(), release(), extend()
  - **Priority: HIGH** (Critical for rotation safety)
  - **Complexity: MEDIUM** (Race conditions, TTL)

### 5. **Database Layer** (High Priority)

**Location:** `src/infrastructure/db/`

- [ ] **mongoClient.js** - MongoDB connection

  - **Priority: HIGH** (External dependency)
  - **Complexity: MEDIUM** (Connection pooling, sessions)

- [ ] **repositories/rotationPolicy.repo.js** - Rotation policies CRUD
  - Methods: findByDomain(), getDueForRotation(), acknowledgeSuccessfulRotation(), getSession()
  - **Priority: HIGH** (Data access layer)
  - **Complexity: MEDIUM** (DB queries, transactions)

### 6. **Filesystem Layer** (Medium Priority)

**Location:** `src/infrastructure/filesystem/`

- [ ] **KeyPaths.js** - File path generator/resolver
  - Methods: Various path generation methods
  - **Priority: MEDIUM** (Path logic)
  - **Complexity: LOW** (String formatting)

### 7. **Logging Layer** (Low Priority)

**Location:** `src/infrastructure/logging/`

- [ ] **logger.js** - Winston logger wrapper
  - **Priority: LOW** (Side effects only)
  - **Complexity: LOW** (Simple wrapper)

---

## 📊 RECOMMENDED TEST ORDER (Priority-Based)

### Phase 1: Domain Core (Week 1)

1. **KeyManager.js** - Core orchestrator (~30-40 tests)
2. **managerFactory.js** - DI wiring (~10-15 tests)
3. **keyResolver.js** - Active KID adapter (~15-20 tests)
4. **domainNormalizer.js** - String utilities (~10-15 tests)

**Estimated:** ~70-90 tests

### Phase 2: Infrastructure Critical (Week 2)

5. **rotationLockRepo.js** - Distributed locks (~25-30 tests)
6. **rotationPolicy.repo.js** - DB operations (~30-40 tests)
7. **RotationConfig.js** - Config validation (~15-20 tests)

**Estimated:** ~70-90 tests

### Phase 3: Infrastructure Support (Week 3)

8. **redisClient.js** - Redis wrapper (~20-25 tests)
9. **mongoClient.js** - MongoDB wrapper (~20-25 tests)
10. **KeyPaths.js** - Path utilities (~15-20 tests)

**Estimated:** ~55-70 tests

### Phase 4: Low Priority (Optional)

11. **RotationState.js** - State object (~5-10 tests, may skip)
12. **logger.js** - Logging wrapper (~10 tests, may skip)

**Estimated:** ~15-20 tests

---

## 📈 TOTAL MISSING TESTS ESTIMATE

- **Domain Layer:** ~95-120 tests
- **Infrastructure Layer:** ~145-185 tests
- **GRAND TOTAL:** ~240-305 additional tests

**Target:** 1000+ tests total (currently at 777)

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
