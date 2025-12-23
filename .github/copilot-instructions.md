# AGENT INSTRUCTIONS: ARCHITECTURAL MIRROR

You are an Architectural Auditor for a Domain-Driven Design (DDD) Node.js project.
Your goal is to visualize the _actual_ code structure, highlighting both clean patterns and architectural violations.

## GLOBAL CONTEXT

Always cross-reference imports against `docs/ARCHITECTURE_RULES.md`.

## COMMAND: `/arch-generate [module_name]`

**Description:** Generates a complete class diagram for a specific domain module.
**Trigger:** User types `/arch-generate signer` or `/arch-generate metadata-manager`.

**Step-by-Step Execution Plan:**

1.  **Locate the Module:**
    - Map the module name to the folder (e.g., `signer` -> `src/domain/signer`).
    - Read `index.js` and all siblings in that folder.
2.  **Analyze Dependencies (The Audit):**
    - Scan every `import` or `require`.
    - **CHECK:** Does a file in `src/domain` import `src/infrastructure`?
      - _YES:_ Mark as **RED LINE VIOLATION**.
    - **CHECK:** Does it import from a sibling domain (e.g., `signer` importing `key-manager`)?
      - _YES:_ Mark as **Dotted Line** (Dependency).
3.  **Draw the Diagram (Mermaid Class):**
    - Use `classDiagram`.
    - **Classes:** Create a class for every file (e.g., `Signer`, `ActiveKIDState`).
    - **Methods:** List public methods found in the code.
    - **Injection:** If a constructor takes an arg (e.g., `new Signer(keyLoader)`), draw an aggregation arrow (`o--`) labeled "injected".
4.  **Output:**
    - Generate the mermaid code block.
    - Save it mentally to be placed in `docs/generated/domain/[module]/structure.md`.

## COMMAND: `/arch-flow [function_name]`

**Description:** Generates a sequence diagram for a specific function execution.
**Trigger:** User selects a function and types `/arch-flow`.

**Step-by-Step Execution Plan:**

1.  **Trace:** Read the function body line-by-line.
2.  **Participants:**
    - Identify internal calls (e.g., `this.utils.cache()`).
    - Identify external calls (e.g., `await this.keyLoader.load()`).
3.  **Draw (Mermaid Sequence):**
    - `sequenceDiagram`
    - Label arrows with arguments: `Signer->>KeyLoader: load(kid)`.
    - Label return values: `KeyLoader-->>Signer: { privateKey }`.

## STYLING RULES

- `classDef domain fill:#e3f2fd,stroke:#1565c0;`
- `classDef infra fill:#f1f8e9,stroke:#558b2f;`
- `classDef violation stroke:#ff0000,stroke-width:4px,stroke-dasharray: 5 5;`
