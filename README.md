# KeyForge

**Domain-aware cryptographic key management and JWT signing infrastructure for distributed systems.**

KeyForge is a security-focused service designed to solve a problem that appears quickly in distributed applications: **how do multiple services securely issue, validate, rotate, and distribute signing keys without spreading private keys across the entire system?**

Instead of embedding long-lived JWT signing secrets or private keys inside individual services, KeyForge centralizes signing-key lifecycle management while exposing only the cryptographic capabilities and public material that other services actually need.

It is designed around **Domain-Driven Design (DDD)** and **Low-Level Design (LLD)** principles, with explicit domain boundaries, isolated responsibilities, and a focus on secure key lifecycle management.

---

## Why KeyForge?

In a microservice architecture, authentication becomes more complicated as the number of services grows.

A naive implementation often looks like:

```text
Service A ── JWT_SECRET ──┐
Service B ── JWT_SECRET ──┤
Service C ── JWT_SECRET ──┤
Service D ── JWT_SECRET ──┘
```

This creates several problems:

* Secrets are duplicated across services.
* Rotating a signing key requires coordinated deployments.
* Compromising one service can expose credentials used elsewhere.
* Public-key distribution becomes difficult to manage.
* Different domains may require different trust boundaries.
* Long-lived private keys become difficult to control.

KeyForge moves signing-key lifecycle management into a dedicated security boundary:

```text
                  ┌─────────────────────┐
                  │      KeyForge       │
                  │                     │
                  │  Key Lifecycle      │
                  │  Key Rotation       │
                  │  JWT Signing        │
                  │  JWKS               │
                  │  Domain Isolation   │
                  └──────────┬──────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
          Auth Domain    User Domain    Service Domain
              │              │              │
          JWT issuance   Verification   Service auth
```

The goal is to make cryptographic key management an **infrastructure capability**, rather than something every application service has to implement independently.

---

# Core Concepts

## Domain-Level Key Isolation

KeyForge treats signing keys as belonging to explicit security domains.

For example:

```text
users
services
internal
payments
admin
```

Each domain can maintain its own signing-key lifecycle and trust boundary.

This makes it possible to separate:

```text
User authentication keys
        ≠
Service authentication keys
```

Instead of treating the entire application as one authentication domain, KeyForge allows the system architecture to define **which actors trust which signing keys**.

This becomes particularly useful in microservice architectures where user authentication and service-to-service authentication have different security requirements.

---

# RSA Signing Keys

KeyForge uses asymmetric cryptography for JWT signing.

The fundamental model is:

```text
                 Private Key
                     │
                     ▼
              ┌──────────────┐
              │    Sign JWT  │
              └──────┬───────┘
                     │
                     ▼
                  JWT Token
                     │
                     ▼
              ┌──────────────┐
              │   Consumer   │
              └──────┬───────┘
                     │
                     ▼
                Public Key
                     │
                     ▼
                Verify JWT
```

The private signing key is controlled by KeyForge, while consumers can obtain the corresponding public key through JWKS.

This eliminates the need for every consuming service to possess the private signing key simply to verify tokens.

---

# JWKS

KeyForge exposes public signing keys through **JSON Web Key Sets (JWKS)**.

A consumer can retrieve the current public keys and select the appropriate key using the JWT `kid` header.

Conceptually:

```text
JWT
 │
 ├── alg = RS256
 └── kid = SERVICE-20260819-ABC123
                    │
                    ▼
                  JWKS
                    │
                    ▼
             Matching Public Key
                    │
                    ▼
              Signature Verify
```

This allows verification services to continue operating without receiving private signing material.

JWKS also makes key rotation practical because multiple public keys can temporarily coexist during a rotation window.

---

# Automatic Key Rotation

Signing keys are not intended to live indefinitely.

KeyForge includes scheduled key rotation so that signing keys can be replaced periodically without requiring application-wide redeployments.

The lifecycle is conceptually:

```text
ACTIVE
  │
  │ rotation interval reached
  ▼
NEW KEY CREATED
  │
  ▼
NEW KEY BECOMES ACTIVE
  │
  ▼
OLD KEY RETAINED FOR VERIFICATION
  │
  │ expiration / retirement policy
  ▼
RETIRED
```

This is important because rotating a signing key is not simply:

```text
delete old key
create new key
```

Previously issued JWTs may still need to be verified.

Therefore, the system needs to distinguish between:

* **Signing key**
* **Active verification keys**
* **Retired keys**
* **Key metadata**
* **Key identifiers (`kid`)**
* **Rotation timing**

---

# Key Handling

Private signing material is treated as sensitive infrastructure data.

The architecture is designed around the principle that:

> **A service that only needs to verify a token should never need access to the private signing key.**

Consumers receive public cryptographic material through JWKS, while signing operations remain within the KeyForge security boundary.

This significantly reduces the number of components that need access to private signing material.

---

# JWT Signing

KeyForge provides JWT signing capabilities using asymmetric signing keys.

JWTs contain a key identifier:

```json
{
  "alg": "RS256",
  "kid": "SERVICE-20260819-ABC123"
}
```

The `kid` allows consumers to determine which public key should be used for verification.

The signing process becomes:

```text
Application
     │
     │ signing request
     ▼
 KeyForge
     │
     │ private key
     ▼
 JWT
     │
     ▼
 Application / Client
```

Verification follows the opposite direction:

```text
JWT
 │
 │ kid
 ▼
JWKS
 │
 │ public key
 ▼
Verify signature
```

---

# Designed for Distributed Systems

KeyForge is intended to support multiple communication boundaries.

### Service → Service

```text
Auth Service
     │
     │ signed service token
     ▼
User Service
```

### Server → Server

```text
Backend A
     │
     │ JWT
     ▼
Backend B
```

### Web → Server

```text
Browser / Client
        │
        │ JWT
        ▼
    API Gateway
        │
        ▼
     Services
```

The same cryptographic infrastructure can therefore support both **internal service authentication** and **external application authentication**, while keeping domain-level trust boundaries explicit.

---

# Architecture

KeyForge follows **Domain-Driven Design (DDD)** concepts to keep business/security concepts separated from infrastructure concerns.

The architecture emphasizes:

```text
Domain
  │
  ├── Entities
  ├── Value Objects
  ├── Domain Rules
  └── Domain Services
          │
          ▼
Application
  │
  ├── Use Cases
  ├── Commands
  └── Orchestration
          │
          ▼
Infrastructure
  │
  ├── Persistence
  ├── Cryptography
  ├── JWT
  ├── JWKS
  └── Scheduling
```

The intention is to avoid putting cryptographic logic, persistence, scheduling, and domain rules into a single large service.

---

# Key Lifecycle

A simplified key lifecycle looks like:

```text
                    ┌──────────────┐
                    │   Generate   │
                    │     Key      │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Store     │
                    │    Metadata  │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    ACTIVE    │
                    └──────┬───────┘
                           │
                    rotation interval
                           │
                           ▼
                    ┌──────────────┐
                    │ Generate New │
                    │     Key      │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ New ACTIVE   │
                    │ Old VERIFY   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   RETIRED    │
                    └──────────────┘
```

This allows rotation without immediately invalidating tokens signed with the previous key.

---

# Security Goals

KeyForge is designed around several security principles:

### 1. Least Privilege

Services should receive only the cryptographic capability they actually require.

### 2. Asymmetric Trust

Verification services use public keys rather than sharing private signing secrets.

### 3. Domain Isolation

Different security domains can maintain independent signing-key lifecycles.

### 4. Key Rotation

Long-lived signing keys are replaced periodically through an automated lifecycle.

### 5. Explicit Key Identification

Every signing key is associated with a unique `kid`, allowing consumers to select the correct verification key.

### 6. Separation of Concerns

Cryptography, key lifecycle management, authentication, persistence, and scheduling are isolated rather than coupled into application services.

---

# Example Use Case: UrbanPocket

KeyForge can serve as the security infrastructure for a microservice architecture such as UrbanPocket.

For example:

```text
                    ┌───────────────┐
                    │   KeyForge    │
                    │               │
                    │ users domain  │
                    │ services      │
                    └───────┬───────┘
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
       Authentication                Service Identity
          Service                         │
             │                            │
             ▼                            ▼
        User JWT                    Service JWT
             │                            │
       ┌─────┴─────┐               ┌──────┴──────┐
       ▼           ▼               ▼             ▼
   Product      Gateway         Product       Other
   Service      Service         Service      Services
```

This gives UrbanPocket a dedicated cryptographic boundary while keeping KeyForge independently usable by other applications.

---

# Engineering Focus

KeyForge is also a systems-design project.

The implementation focuses on understanding and applying:

* Domain-Driven Design
* Low-Level Design
* Domain boundaries
* Cryptographic key lifecycle management
* Asymmetric cryptography
* JWT architecture
* JWKS
* Key rotation
* Service-to-service authentication
* Distributed-system security
* Separation of concerns
* Secure infrastructure design
* Automated background jobs
* Testable application architecture

The project is intentionally designed as an **independent infrastructure component**, rather than being tightly coupled to a single application.

---

# Project Structure

The repository separates the implementation into source code, documentation, and tests:

```text
src/
docs/
tests/
journey.md
structure.md
```

The project also documents the architectural evolution and design decisions made during development.

---

# Status

KeyForge is an actively developed engineering project.

The current focus is on building a clean key-management foundation that can be integrated into distributed backend systems and extended with additional authentication and security capabilities over time.
