# folder structure (fro reference only)
```
src/
├── app.js
│   # Application bootstrap & composition root
│   # Wires transport, application services, adapters, and infrastructure
│
├── transport/
│   ├── grpc/
│   │   ├── server/
│   │   │   ├── index.js
│   │   │   ├── vault.server.js
│   │   │   │   # Registers gRPC services
│   │   │   │   # Applies interceptors
│   │   │   │   # Binds server + credentials
│   │   │   │   # NO business logic
│   │   │
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.js
│   │   │   │   │   # Transport-level authentication / authorization
│   │   │   │   │   # Metadata inspection, blocklists, identity checks
│   │   │   │   │   # MUST NOT contain business rules
│   │   │   │
│   │   │   │   ├── deadline.interceptor.js
│   │   │   │   │   # Enforces request deadlines / timeouts
│   │   │   │
│   │   │   │   └── logging.interceptor.js
│   │   │   │       # Logs request/response lifecycle (optional / env-based)
│   │   │
│   │   │   └── handlers/
│   │   │       ├── sign.handler.js
│   │   │       │   # Transport → Application adapter
│   │   │       │   # Validates request shape
│   │   │       │   # Calls application service
│   │   │       │   # Maps result to gRPC response
│   │   │       │   # NO business logic
│   │   │
│   │   │       └── index.js
│   │   │           # Exports handlers
│   │   │
│   │   ├── client/ #( we not need client in vault because we are not using external apis )
│   │   │   ├── index.js
│   │   │   │   # Exports raw gRPC clients
│   │   │   │   # Used ONLY by infrastructure adapters
│   │   │
│   │   │   ├── vault.client.js
│   │   │   │   # Low-level gRPC client (protobuf + TLS + retries)
│   │   │
│   │   │   ├── auth.client.js
│   │   │   │   # Low-level gRPC client for Auth service (if consumed)
│   │   │
│   │   │   └── base/
│   │   │       ├── grpcClientFactory.js
│   │   │       │   # Creates gRPC channels & credentials (mTLS)
│   │   │       │   # Centralized TLS, retry, keepalive config
│   │   │
│   │   │       └── retryPolicy.js
│   │   │           # Retry / backoff / timeout rules
│   │   │
│   │   └── proto/
│   │       ├── vault.proto
│   │       └── auth.proto
│   │
│   └── http/
│       ├── server.js
│       │   # HTTP server bootstrap (REST)
│       │
│       └── routes/
│           # HTTP routes mapping → application services
│
├── application/
│   ├── services/
│   │   ├── TokenService.js
│   │   │   # Use-case: Sign tokens
│   │   │   # Orchestrates domain logic
│   │   │   # Calls ports if external interaction is needed
│   │
│   │   ├── UserService.js
│   │   │   # Use-case: user-related flows
│   │
│   │   └── KeyService.js
│   │       # Use-case: key lifecycle / queries
│   │
│   └── ports/
│       ├── VaultPort.js
│       │   # Interface describing external Vault capabilities
│       │   # Declared by Application
│       │   # Implemented by infrastructure adapters
│       │
│       └── TokenSignerPort.js
│           # Interface for external signing capability
│
├── domain/
│   └── key-manager/
│       └── KeyManager.js
│           # Core domain orchestrator
│           # Owns invariants, lifecycle, crypto flow
│           # NO transport, NO ports, NO infrastructure
│
├── infrastructure/
│   ├── adapters/
│   │   ├── VaultGrpcAdapter.js
│   │   │   # Implements VaultPort
│   │   │   # Translates application calls → gRPC client
│   │   │   # Normalizes responses & errors
│   │   │
│   │   └── TokenSignerGrpcAdapter.js
│   │       # Implements TokenSignerPort
│   │
│   ├── grpc/
│   │   # Shared gRPC utilities (credentials, helpers)
│   │
│   ├── crypto/
│   │   # Cryptographic primitives (internal)
│   │
│   ├── cache/
│   │   # Redis / in-memory cache implementations
│   │
│   ├── database/
│   │   # Database repositories & clients
│   │
│   ├── filesystem/
│   │   # Filesystem abstractions (paths, IO)
│   │
│   └── logging/
│       # Logging infrastructure
│
└── config/
    ├── grpc.js
    │   # gRPC configuration (ports, keepalive, limits)
    │
    └── tls.js
        # TLS / mTLS configuration (cert paths, CA trust)
```


plan

  what to do next 
   everything is working till now . 
   we have to add corn jobs config with deeloper upper and lower bound 
   while initial setup we should pass interval time for roatation for initial policy build 
   
   above are our main priorties 
   then we will make admin apis for rotation (all and single)
   and for config setup (view and update bteween dev constraints)

   then we add tests

   then we add logging and monitoring

   then we documantize our work
