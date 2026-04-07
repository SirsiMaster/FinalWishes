# ADR-009: Transition to gRPC and Protocol Buffers

## Status
Superseded by ADR-004 (April 7, 2026). gRPC architecture is accepted and implemented via ConnectRPC in the Go API.

## Context
The Sirsi Infrastructure Layer and its tenants (like FinalWishes) require high-performance, strictly typed, and language-agnostic service boundaries. While REST/JSON served the initial prototyping phase, the complexity of legal metadata, document versioning, and financial transactions necessitates the reliability and efficiency of gRPC and Protocol Buffers.

## Decision
We will pivot the entire Sirsi API architecture to **gRPC** and **Protocol Buffers** for all service-to-service and client-to-server communication.

### 1. Protocol Buffers as the Schema Source of Truth
*   All data models (Projects, Contracts, Users, Payments) will be defined in `.proto` files.
*   Protobuf will serve as the shared contract between the Go backend, the React-Web frontend, and the React Native mobile app.

### 2. gRPC for Backend Services
*   All Cloud Run services will expose gRPC endpoints.
*   We will use gRPC's built-in support for streaming where applicable (e.g., real-time document processing updates).

### 3. gRPC-Web for Frontend Connectivity
*   For the React/Vite web application, we will utilize `grpc-web` or a proxy (like Envoy or Cloud Run's native gRPC support) to enable communication between the browser and the gRPC backend.

### 4. Code Generation
*   Standardized `buf` or `protoc` workflows will be established to generate Go, TypeScript, and React Native bindings from the shared proto definitions.

## Consequences
*   **Positive**: Strict type safety across the entire stack. Smallest possible payload size for mobile/web performance.
*   **Positive**: Automatic documentation via proto definitions. No need for manual OpenAPI/Swagger maintenance.
*   **Neutral**: Increased complexity in the initial build setup (protoc plugins, gRPC-Web proxies).
*   **Neutral**: Frontend developers must adapt to the gRPC-Web client pattern.
*   **Negative**: Slight overhead in debugging compared to plain JSON/REST (requires specialized tools like Postman with gRPC support or `grpcurl`).

## Compliance Alignment
*   **Security**: gRPC enforces TLS by default and provides strong support for authentication interceptors.
*   **Efficiency**: Reduces compute costs on Cloud Run due to significantly lower CPU overhead for serialization/deserialization compared to JSON.
