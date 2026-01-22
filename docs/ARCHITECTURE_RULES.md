# Architectural Laws (DDD Strict Mode)

## 1. Layers

- **Domain Layer (`src/domain`):**
  Pure business logic and orchestration.
  Must not perform IO, cryptography, filesystem access, or network calls.

- **Application Layer (`src/application`):**
  Use-case orchestration.
  Bridges domain logic with transports and scheduling (cron, APIs).

- **Infrastructure Layer (`src/infrastructure`):**
  Technical implementations such as filesystem, databases, crypto engines,
  caches, and network clients.

- **Core / Utils Layer (`src/utils`):**
  Stateless, dependency-free helpers.
  Must not depend on domain or infrastructure.

---

## 2. Red Line Violations

### 2.1 Infrastructure Leak (FORBIDDEN)

- IF a file in `src/domain/*` imports from `src/infrastructure/*`
- THEN it is a **RED LINE VIOLATION**

Correct approach:
- Domain defines interfaces (ports)
- Application or index wiring injects infrastructure implementations

---

### 2.2 Sibling Domain Coupling (WARNING)

- IF one domain module imports another domain module
- THEN it is a **WARNING**

Allowed only when:
- One domain explicitly orchestrates another
- The dependency direction is documented

---

## 3. Orchestration Rule

- Business workflows must live in:
  - Domain orchestrators
  - Application services

- Factories, adapters, and index files must not contain business logic.

---

## 4. Diagram Styling

- **Domain:** `fill:#e3f2fd,stroke:#1565c0`
- **Application:** `fill:#fff3e0,stroke:#ef6c00`
- **Infrastructure:** `fill:#f1f8e9,stroke:#558b2f`
- **Violations:** `stroke:red,stroke-width:4px,stroke-dasharray: 5 5`
