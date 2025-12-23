# Architectural Laws (DDD Strict Mode)

## 1. The Layers

- **Domain Layer (`src/domain`):** Pure business logic.
  - _Modules:_ `Signer`, `KeyManager`, `MetadataManager`.
  - _Rule:_ Must NOT depend on concrete `infrastructure` files.
- **Infrastructure Layer (`src/infrastructure`):** Technical implementations.
  - _Modules:_ `filesystem`, `db`, `crypto`, `cache`.
  - _Rule:_ Can import `domain` (to implement interfaces), but `domain` cannot import _it_.
- **Core Layer (`src/core`):** Low-level utilities (RSA generators).

## 2. Red Line Violations (Strictly Forbidden Imports)

1.  **The "Infrastructure Leak":**
    - **IF** a file in `src/domain/*` imports from `src/infrastructure/*`
    - **THEN** it is a VIOLATION.
    - _Correct approach:_ The domain should define an Interface, and the Application Layer (or `index.js` wiring) should inject the infrastructure.
2.  **The "Sibling Coupling":**
    - **IF** `Loader` (`domain/key-manager/loader`) directly imports `Builder` (`domain/metadata-manager/metaBuilder.js`)
    - **THEN** it is a WARNING. (Cross-domain context coupling should be minimized).

## 3. Diagram Styling

- **Domain Entities:** `fill:#e3f2fd,stroke:#1565c0` (Blue)
- **Infrastructure:** `fill:#f1f8e9,stroke:#558b2f` (Green)
- **Violations:** `stroke:red,stroke-width:4px`
