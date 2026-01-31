# Component Dependencies

## Overview

本ドキュメントでは、コンポーネント間の依存関係、通信パターン、データフローを定義します。

**Architecture Pattern**: Frontend/Backend完全分離 + BFF Pattern

---

## Dependency Matrix

### Frontend Components Dependencies

| Component | Depends On | Communication |
|-----------|-----------|---------------|
| Authentication Component | Authentication Service | HTTP/REST |
| Project Management Component | Project Management Service | HTTP/REST |
| Specification Editor Component | Specification Management Service, Validation Service | HTTP/REST |
| Code Preview Component | Code Generation Service | HTTP/REST |
| Validation Viewer Component | Validation & Consistency Service | HTTP/REST |
| Tutorial Component | Tutorial & Help Service | HTTP/REST |
| UI Shell Component | All Frontend Components | Component Props/Events |

### Backend Service Dependencies

| Service | Depends On | Communication |
|---------|-----------|---------------|
| Authentication Service | OAuth Providers (Google, GitHub), Data Persistence Service | External API, Internal |
| Project Management Service | Authentication Service, Data Persistence Service | Internal |
| Specification Management Service | Authentication Service, Validation Service, Data Persistence Service | Internal |
| Code Generation Service | Specification Management Service, AI Service, Data Persistence Service | Internal |
| Validation & Consistency Service | Specification Management Service, Code Generation Service | Internal |
| Tutorial & Help Service | Project Management Service, Specification Management Service | Internal |

---

## Component Dependency Diagram

```
+-----------------------------------------------------------+
|                    Frontend (SPA)                         |
+-----------------------------------------------------------+
|                                                           |
|  +----------------+  +-------------------+                |
|  | Authentication |  | Project Mgmt      |                |
|  | Component      |  | Component         |                |
|  +-------+--------+  +--------+----------+                |
|          |                    |                           |
|  +-------v--------+  +--------v----------+                |
|  | Spec Editor    |  | Code Preview      |                |
|  | Component      |  | Component         |                |
|  +-------+--------+  +-------------------+                |
|          |                                                |
|  +-------v--------+  +-------------------+                |
|  | Validation     |  | Tutorial          |                |
|  | Viewer         |  | Component         |                |
|  +----------------+  +-------------------+                |
|                                                           |
|  +--------------------------------------------------+    |
|  |           UI Shell Component                     |    |
|  +--------------------------------------------------+    |
+-----------------------------------------------------------+
                         |
                         | HTTP/REST
                         v
+-----------------------------------------------------------+
|              BFF Service Layer (Backend)                  |
+-----------------------------------------------------------+
|                                                           |
|  +------------------+   +--------------------+            |
|  | Auth Service     |   | Project Mgmt       |            |
|  +--------+---------+   | Service            |            |
|           |             +----------+---------+            |
|           |                        |                      |
|  +--------v---------+   +----------v---------+            |
|  | Spec Mgmt        |   | Code Generation    |            |
|  | Service          |   | Service            |            |
|  +--------+---------+   +----------+---------+            |
|           |                        |                      |
|  +--------v---------+   +----------v---------+            |
|  | Validation &     |   | Tutorial & Help    |            |
|  | Consistency Svc  |   | Service            |            |
|  +--------+---------+   +--------------------+            |
|           |                                               |
+-----------|-----------------------------------------------+
            |
            v
+-----------------------------------------------------------+
|               Backend Components                          |
+-----------------------------------------------------------+
|                                                           |
|  +------------------+   +--------------------+            |
|  | Auth Service     |   | Project Service    |            |
|  | Component        |   | Component          |            |
|  +------------------+   +--------------------+            |
|                                                           |
|  +------------------+   +--------------------+            |
|  | Specification    |   | Validation Service |            |
|  | Service Comp     |   | Component          |            |
|  +------------------+   +--------------------+            |
|                                                           |
|  +------------------+   +--------------------+            |
|  | Code Generator   |   | AI Service         |            |
|  | Component        |   | Component          |            |
|  +------------------+   +--------------------+            |
|                                                           |
|  +------------------------------------------------+      |
|  | Data Persistence Service Component             |      |
|  +------------------------------------------------+      |
+-----------------------------------------------------------+
            |
            v
+-----------------------------------------------------------+
|                  Data Layer                               |
+-----------------------------------------------------------+
|  +------------------+   +--------------------+            |
|  | Database         |   | File Storage (S3)  |            |
|  | (DynamoDB/RDS)   |   |                    |            |
|  +------------------+   +--------------------+            |
+-----------------------------------------------------------+
            |
            v
+-----------------------------------------------------------+
|              External Services                            |
+-----------------------------------------------------------+
|  +------------------+   +--------------------+            |
|  | OAuth Providers  |   | AI API             |            |
|  | (Google, GitHub) |   | (OpenAI, Claude)   |            |
|  +------------------+   +--------------------+            |
+-----------------------------------------------------------+
```

---

## Communication Patterns

### 1. Frontend → BFF Communication
**Protocol**: HTTP/REST
**Format**: JSON
**Pattern**: Request-Response (Synchronous)

**Example Flow**:
```
Frontend Component → API Call → BFF Service → Response → Frontend Component
```

---

### 2. BFF Service → Backend Component Communication
**Protocol**: Internal Function Calls
**Format**: Native Language Objects
**Pattern**: Direct Invocation

**Example Flow**:
```
BFF Service → Component Method → Backend Logic → Data Layer → Response
```

---

### 3. Backend Component → Data Layer Communication
**Protocol**: Database Client SDK / S3 SDK
**Format**: Query Parameters / Binary Data
**Pattern**: Query-Response

**Example Flow**:
```
Component → Database Query → Result Set → Component Processing
Component → S3 Upload → Confirmation → Component Continue
```

---

### 4. Backend Component → External Service Communication
**Protocol**: HTTPS API
**Format**: JSON / OAuth Tokens
**Pattern**: Request-Response with Error Handling

**Example Flow**:
```
Component → External API Request → (Retry Logic) → Response → Component
```

---

## Data Flow Patterns

### Pattern 1: User Authentication Flow

```
1. User → Auth Component: Click Login
2. Auth Component → Auth Service: POST /api/auth/google
3. Auth Service → OAuth Provider: Redirect to Google
4. OAuth Provider → User: Login Page
5. User → OAuth Provider: Provide Credentials
6. OAuth Provider → Auth Service: Authorization Code
7. Auth Service → OAuth Provider: Exchange Code for Token
8. Auth Service → User Profile Service: Get/Create Profile
9. Auth Service → Session Service: Create Session
10. Auth Service → Database: Store Session
11. Auth Service → Auth Component: Return Auth Token
12. Auth Component → Session Manager: Store Token Locally
```

---

### Pattern 2: Project Creation Flow

```
1. User → Project Mgmt Component: Create Project Form
2. Project Mgmt Component → Project Mgmt Service: POST /api/projects
3. Project Mgmt Service → Auth Service: Validate Token
4. Project Mgmt Service → Project Service Component: Create Project
5. Project Service Component → Database: INSERT Project
6. Project Service Component → Project Mgmt Service: Project Created
7. Project Mgmt Service → Project Mgmt Component: Return Project
8. Project Mgmt Component → UI: Display New Project
```

---

### Pattern 3: Specification Editing & Validation Flow

```
1. User → Spec Editor: Type Specification
2. Spec Editor → Validation Display: Show Realtime Feedback
3. Spec Editor → Spec Mgmt Service: Auto-save (debounced)
4. Spec Mgmt Service → Validation Service: Validate Spec
5. Validation Service → Validation Engine: Run Validation
6. Validation Engine → Spec Mgmt Service: Validation Results
7. Spec Mgmt Service → Specification Service: Save Spec
8. Specification Service → Database: UPDATE Specification
9. Specification Service → S3: Store Spec Content (if large)
10. Spec Mgmt Service → Spec Editor: Confirmation
11. Spec Editor → Validation Display: Update Validation UI
```

---

### Pattern 4: Code Generation Flow

```
1. User → Code Preview Component: Request Code Generation
2. Code Preview Component → Code Gen Service: POST /api/code-generation
3. Code Gen Service → Spec Mgmt Service: GET Specification
4. Code Gen Service → AI Service: Request AI Assistance
5. AI Service → External AI API: Send Prompt
6. External AI API → AI Service: AI Response
7. AI Service → Code Gen Service: AI Suggestions
8. Code Gen Service → Code Generator Component: Generate Code
9. Code Generator Component → Template Engine: Apply Templates
10. Template Engine → Code Generator: Generated Code
11. Code Generator → Validation Service: Validate Generated Code
12. Code Gen Service → Database: Store Metadata
13. Code Gen Service → S3: Store Generated Files
14. Code Gen Service → Code Preview Component: Return Generated Code
15. Code Preview Component → Code Viewer: Display Code
```

---

### Pattern 5: Consistency Check Flow

```
1. User → Validation Viewer: Request Consistency Check
2. Validation Viewer → Validation & Consistency Service: POST /api/consistency-check
3. V&C Service → Spec Mgmt Service: GET Specification
4. V&C Service → Code Gen Service: GET Generated Code
5. V&C Service → Consistency Checker Component: Check Consistency
6. Consistency Checker → Spec Parser: Parse Specification
7. Consistency Checker → Code Analyzer: Analyze Code
8. Consistency Checker → Comparison Engine: Find Differences
9. Consistency Checker → V&C Service: Consistency Results
10. V&C Service → Validation Viewer: Return Results
11. Validation Viewer → Issue Highlighter: Highlight Issues
```

---

## Dependency Management Rules

### 1. Layered Dependency Rule
- Frontend Components → BFF Services ONLY
- BFF Services → Backend Components ONLY
- Backend Components → Data Layer OR External Services ONLY
- **NO circular dependencies allowed**

### 2. Component Independence
- Components should NOT directly depend on other components' internal implementation
- Use well-defined interfaces for all inter-component communication
- Favor loose coupling through service interfaces

### 3. Data Flow Direction
- **Downward Flow**: Frontend → BFF → Backend → Data
- **Upward Flow**: Data → Backend → BFF → Frontend
- **NO cross-layer jumps** (e.g., Frontend directly to Data Layer)

---

## Error Propagation Pattern

```
External Service Error
    ↓
Backend Component (Handle/Transform)
    ↓
BFF Service (Add Context)
    ↓
Frontend Component (Display to User)
```

**Handling Strategy**:
1. **Catch at Origin**: Backend Component handles low-level errors
2. **Transform**: Convert to business-level error messages
3. **Propagate**: Pass through layers with added context
4. **Display**: Frontend shows user-friendly error messages

---

## Dependency Injection Strategy

### Frontend (React/Vue)
- Use Context API / Provide/Inject for service injection
- Component receives services through props or context

### Backend (Node.js/Python)
- Use Dependency Injection framework
- Services registered in IoC container
- Components receive dependencies through constructor

---

## Testing Implications

### Unit Testing
- **Frontend Components**: Mock BFF Services
- **BFF Services**: Mock Backend Components
- **Backend Components**: Mock Data Layer

### Integration Testing
- **Frontend Integration**: Test Component + Mocked BFF
- **BFF Integration**: Test Service + Mocked Backend
- **Backend Integration**: Test Component + Real/Test Database

### End-to-End Testing
- **Full Stack**: Frontend → BFF → Backend → Data Layer
- Use test data and isolated test environment

---

## Scalability Considerations

### Current (MVP)
- **Frontend**: Single SPA instance
- **BFF**: Single instance
- **Backend**: Single instance
- **Data**: Single database + S3

### Future (Scale-Out)
- **Frontend**: CDN distribution
- **BFF**: Load-balanced multiple instances
- **Backend**: Microservices with independent scaling
- **Data**: Database replication + Caching layer

---

## Security Boundaries

```
+------------------------+
| Frontend (Untrusted)   |
+------------------------+
         ↓ HTTPS + Token
+------------------------+
| BFF (Trust Boundary)   | ← Authentication & Authorization
+------------------------+
         ↓ Internal
+------------------------+
| Backend (Trusted)      |
+------------------------+
         ↓ Secured
+------------------------+
| Data Layer (Trusted)   |
+------------------------+
```

**Security Enforcement**:
- Authentication: At BFF Service Layer
- Authorization: At BFF Service Layer
- Data Validation: Frontend (UX) + Backend (Security)
- Encryption: HTTPS for external, TLS for internal (production)

---

## Summary

### Total Dependencies
- **Frontend Components**: 7 components with 6 service dependencies
- **BFF Services**: 6 services with multiple backend component dependencies
- **Backend Components**: 7 components with data layer dependencies
- **External Dependencies**: 2 (OAuth Providers, AI API)

### Communication Protocols
- Frontend ↔ BFF: HTTP/REST (JSON)
- BFF ↔ Backend: Internal Function Calls
- Backend ↔ Data: SDK Calls
- Backend ↔ External: HTTPS API

### Key Principles
1. **Separation of Concerns**: Clear layer boundaries
2. **Loose Coupling**: Services communicate through interfaces
3. **Unidirectional Flow**: Respect layered architecture
4. **Error Handling**: Propagate errors with context
5. **Testability**: Easy to mock dependencies

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Status**: Complete