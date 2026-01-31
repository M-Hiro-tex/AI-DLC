# Unit of Work Dependency Matrix

## Overview

本ドキュメントでは、ユニット間の依存関係と統合ポイントを定義します。

**Total Units**: 7 (1 Frontend, 6 Backend)  
**Dependency Management**: Loose coupling via API interfaces  
**Communication**: REST APIs (synchronous), Future: Event-driven (asynchronous)

---

## Dependency Matrix

| Unit | U1: Frontend | U2: Auth | U3: Project | U4: Spec | U5: CodeGen | U6: Validation | U7: AI |
|------|-------------|----------|-------------|----------|-------------|----------------|--------|
| **U1: Frontend** | - | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| **U2: Auth** | - | - | - | - | - | - | - |
| **U3: Project** | - | ✓ | - | - | - | - | - |
| **U4: Spec** | - | ✓ | ✓ | - | - | - | - |
| **U5: CodeGen** | - | ✓ | - | ✓ | - | - | ✓ |
| **U6: Validation** | - | ✓ | - | ✓ | ✓ | - | - |
| **U7: AI** | - | - | - | - | - | - | - |

**Legend**:
- ✓ = Direct dependency (Unit in row depends on unit in column)
- \- = No dependency

---

## Detailed Unit Dependencies

### Unit 1: Frontend Unit
**Depends On**: U2 (Auth), U3 (Project), U4 (Spec), U5 (CodeGen), U6 (Validation)  
**Depended By**: None

**Dependency Details**:
- **U2 (Auth)**: 
  - Purpose: User authentication and session management
  - APIs Used: `/api/auth/*`, `/api/users/*`
  - Data Flow: Login requests, session validation

- **U3 (Project)**:
  - Purpose: Project CRUD operations
  - APIs Used: `/api/projects/*`
  - Data Flow: Project creation, listing, updates, deletion

- **U4 (Spec)**:
  - Purpose: Specification management
  - APIs Used: `/api/specifications/*`
  - Data Flow: Spec creation, editing, versioning

- **U5 (CodeGen)**:
  - Purpose: Code generation and preview
  - APIs Used: `/api/code-generation/*`
  - Data Flow: Generate code, retrieve generated code, download

- **U6 (Validation)**:
  - Purpose: Real-time validation
  - APIs Used: `/api/validation/*`
  - Data Flow: Syntax/semantic/consistency validation requests

**Integration Points**:
- API Gateway: https://api.example.com
- Authentication: Bearer token in Authorization header
- Error Handling: Standard HTTP status codes + JSON error responses

---

### Unit 2: Authentication Domain
**Depends On**: None  
**Depended By**: U1 (Frontend), U3 (Project), U4 (Spec), U5 (CodeGen), U6 (Validation)

**Dependency Details**: No dependencies (foundational service)

**Provided APIs**:
```
POST   /api/auth/google          # Google OAuth
POST   /api/auth/github          # GitHub OAuth
POST   /api/auth/logout          # Logout
GET    /api/auth/session         # Session validation
POST   /api/auth/refresh         # Token refresh
GET    /api/users/{id}           # User profile
PUT    /api/users/{id}           # Update profile
```

**Integration Points**:
- **External**: OAuth Providers (Google, GitHub)
- **Internal**: All backend services validate tokens via this service

**Consumed By**:
- All backend services for authentication/authorization
- Frontend for login/logout flows

---

### Unit 3: Project Domain
**Depends On**: U2 (Auth)  
**Depended By**: U1 (Frontend), U4 (Spec)

**Dependency Details**:
- **U2 (Auth)**:
  - Purpose: User authentication and ownership validation
  - APIs Used: `/api/auth/session` (token validation)
  - Data Flow: Validate user identity before project operations

**Provided APIs**:
```
POST   /api/projects             # Create project
GET    /api/projects             # List projects
GET    /api/projects/{id}        # Get project
PUT    /api/projects/{id}        # Update project
DELETE /api/projects/{id}        # Delete project
GET    /api/projects/{id}/stats  # Statistics
```

**Integration Points**:
- **Auth Service**: User validation middleware
- **Frontend**: Project management UI
- **Spec Service**: Projects contain specifications

---

### Unit 4: Specification Domain
**Depends On**: U2 (Auth), U3 (Project)  
**Depended By**: U1 (Frontend), U5 (CodeGen), U6 (Validation)

**Dependency Details**:
- **U2 (Auth)**:
  - Purpose: User authentication
  - APIs Used: `/api/auth/session`
  - Data Flow: Validate user before spec operations

- **U3 (Project)**:
  - Purpose: Link specifications to projects
  - APIs Used: `/api/projects/{id}` (validate project exists)
  - Data Flow: Verify project ownership when creating/updating specs

**Provided APIs**:
```
POST   /api/specifications                    # Create spec
GET    /api/specifications/{id}               # Get spec
PUT    /api/specifications/{id}               # Update spec
DELETE /api/specifications/{id}               # Delete spec
GET    /api/specifications/{id}/versions      # Version history
POST   /api/specifications/{id}/versions      # Create version
GET    /api/specifications/{id}/versions/{v}  # Get version
```

**Integration Points**:
- **Storage**: S3 for large specification content
- **Database**: DynamoDB for metadata
- **Code Generation**: Specs are input for code generation
- **Validation**: Specs are validated for correctness

---

### Unit 5: Code Generation Domain
**Depends On**: U2 (Auth), U4 (Spec), U7 (AI)  
**Depended By**: U1 (Frontend), U6 (Validation)

**Dependency Details**:
- **U2 (Auth)**:
  - Purpose: User authentication
  - APIs Used: `/api/auth/session`
  - Data Flow: Validate user before code generation

- **U4 (Spec)**:
  - Purpose: Retrieve specification for code generation
  - APIs Used: `/api/specifications/{id}`
  - Data Flow: Fetch spec content to generate code

- **U7 (AI)**:
  - Purpose: AI-assisted code generation
  - APIs Used: `/api/ai/code-suggestion`
  - Data Flow: Request AI suggestions during generation

**Provided APIs**:
```
POST   /api/code-generation                    # Generate code
GET    /api/code-generation/{id}               # Get generated code
POST   /api/code-generation/{id}/regenerate    # Regenerate
GET    /api/code-generation/project/{pid}      # List codes
GET    /api/code-generation/{id}/download      # Download
```

**Integration Points**:
- **Storage**: S3 for generated code files
- **Database**: DynamoDB for metadata
- **AI Service**: Optional AI assistance
- **Validation**: Generated code checked for consistency

---

### Unit 6: Validation Domain
**Depends On**: U2 (Auth), U4 (Spec), U5 (CodeGen)  
**Depended By**: U1 (Frontend)

**Dependency Details**:
- **U2 (Auth)**:
  - Purpose: User authentication
  - APIs Used: `/api/auth/session`
  - Data Flow: Validate user before validation operations

- **U4 (Spec)**:
  - Purpose: Retrieve specification for validation
  - APIs Used: `/api/specifications/{id}`
  - Data Flow: Fetch spec to validate syntax/semantics

- **U5 (CodeGen)**:
  - Purpose: Consistency checking between spec and generated code
  - APIs Used: `/api/code-generation/{id}`
  - Data Flow: Fetch generated code for consistency validation

**Provided APIs**:
```
POST   /api/validation/syntax              # Syntax validation
POST   /api/validation/semantic            # Semantic validation
POST   /api/validation/consistency         # Consistency check
POST   /api/validation/full                # Full validation
GET    /api/validation/rules               # Validation rules
```

**Integration Points**:
- **Frontend**: Real-time validation during editing
- **Spec Service**: Validate specifications
- **CodeGen Service**: Check spec-code consistency

---

### Unit 7: AI Service (Independent)
**Depends On**: None  
**Depended By**: U5 (CodeGen)

**Dependency Details**: None (independent service)

**Provided APIs**:
```
POST   /api/ai/code-suggestion         # Code suggestions
POST   /api/ai/spec-improvement        # Spec improvements
POST   /api/ai/code-explanation        # Explain code
POST   /api/ai/question                # Answer questions
GET    /api/ai/usage/{userId}          # Usage statistics
```

**Integration Points**:
- **External**: OpenAI API, Claude API
- **Internal**: Code Generation Service (primary consumer)
- **Future**: May be used by other services for AI features

**Note**: Independent unit, no dependency on other backend services

---

## Dependency Layers

### Layer 1: Foundation (No Dependencies)
- **U2: Authentication Domain** - Foundational authentication service
- **U7: AI Service** - Independent AI capabilities

### Layer 2: Core Domain Services (Depends on Layer 1)
- **U3: Project Domain** - Depends on U2 (Auth)

### Layer 3: Content Services (Depends on Layers 1-2)
- **U4: Specification Domain** - Depends on U2 (Auth), U3 (Project)

### Layer 4: Generation and Validation (Depends on Layers 1-3)
- **U5: Code Generation Domain** - Depends on U2 (Auth), U4 (Spec), U7 (AI)
- **U6: Validation Domain** - Depends on U2 (Auth), U4 (Spec), U5 (CodeGen)

### Layer 5: Frontend (Depends on All Backend Layers)
- **U1: Frontend Unit** - Depends on U2, U3, U4, U5, U6

---

## Data Flow Patterns

### Pattern 1: User Authentication Flow

```
U1 (Frontend)
    ↓ POST /api/auth/google
U2 (Auth) → OAuth Provider → Session Token
    ↓ 
U1 (Frontend) stores token
```

### Pattern 2: Project Creation Flow

```
U1 (Frontend)
    ↓ POST /api/projects (with auth token)
U3 (Project)
    ↓ Validate token
U2 (Auth) validates
    ↓
U3 (Project) creates project → DynamoDB
    ↓
U1 (Frontend) receives project
```

### Pattern 3: Specification Editing Flow

```
U1 (Frontend - Editor)
    ↓ Real-time editing
    ↓ POST /api/validation/syntax (debounced)
U6 (Validation)
    ↓ Fetch spec
U4 (Spec) returns spec
    ↓
U6 (Validation) validates → Returns errors
    ↓
U1 (Frontend) displays validation results
```

### Pattern 4: Code Generation Flow

```
U1 (Frontend)
    ↓ POST /api/code-generation
U5 (CodeGen)
    ↓ Fetch specification
U4 (Spec) returns spec
    ↓
U5 (CodeGen)
    ↓ Request AI assistance
U7 (AI) provides suggestions
    ↓
U5 (CodeGen) generates code → S3
    ↓
U1 (Frontend) receives generated code
```

### Pattern 5: Consistency Check Flow

```
U1 (Frontend)
    ↓ POST /api/validation/consistency
U6 (Validation)
    ↓ Fetch spec
U4 (Spec) returns spec
    ↓ 
U6 (Validation)
    ↓ Fetch generated code
U5 (CodeGen) returns code
    ↓
U6 (Validation) checks consistency → Returns results
    ↓
U1 (Frontend) displays consistency report
```

---

## Integration Contracts

### Authentication Contract
**Provider**: U2 (Auth)  
**Consumers**: U3, U4, U5, U6

**Contract**:
```typescript
interface AuthValidation {
  validateToken(token: string): Promise<UserContext>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
}

interface UserContext {
  userId: string;
  email: string;
  roles: string[];
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: Insufficient permissions

---

### Specification Contract
**Provider**: U4 (Spec)  
**Consumers**: U5 (CodeGen), U6 (Validation)

**Contract**:
```typescript
interface SpecificationService {
  getSpecification(id: string): Promise<Specification>;
  getSpecificationVersion(id: string, version: string): Promise<Specification>;
}

interface Specification {
  id: string;
  projectId: string;
  content: string;
  version: string;
  metadata: SpecMetadata;
}
```

---

### Code Generation Contract
**Provider**: U5 (CodeGen)  
**Consumers**: U6 (Validation)

**Contract**:
```typescript
interface CodeGenerationService {
  getGeneratedCode(id: string): Promise<GeneratedCode>;
}

interface GeneratedCode {
  id: string;
  specificationId: string;
  files: CodeFile[];
  metadata: CodeMetadata;
}
```

---

### AI Service Contract
**Provider**: U7 (AI)  
**Consumers**: U5 (CodeGen)

**Contract**:
```typescript
interface AIService {
  generateCodeSuggestion(spec: string, context: CodeContext): Promise<AISuggestion>;
  improveSpecification(spec: string): Promise<SpecImprovement>;
}

interface AISuggestion {
  code: string;
  explanation: string;
  confidence: number;
}
```

---

## Circular Dependency Prevention

**Rules**:
1. **No circular dependencies allowed** between units
2. **Layered architecture**: Higher layers depend on lower layers, never reverse
3. **Validation-CodeGen relationship**: 
   - Validation depends on CodeGen (reads generated code)
   - CodeGen does NOT depend on Validation (one-way dependency)

**Validation**:
- Dependency graph is acyclic (DAG)
- Each unit can be deployed independently
- Testing can be done in layer order (bottom-up)

---

## API Gateway Configuration

### Route Mapping

```yaml
/api/auth/*           → U2 (Auth)
/api/users/*          → U2 (Auth)
/api/projects/*       → U3 (Project)
/api/specifications/* → U4 (Spec)
/api/code-generation/* → U5 (CodeGen)
/api/validation/*     → U6 (Validation)
/api/ai/*             → U7 (AI)
```

### Cross-Origin Resource Sharing (CORS)

```yaml
Allowed Origins: https://app.example.com
Allowed Methods: GET, POST, PUT, DELETE, OPTIONS
Allowed Headers: Authorization, Content-Type
Max Age: 3600
```

---

## Error Handling Strategy

### Standard Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "timestamp": "2026-01-31T23:20:00Z"
  }
}
```

### Error Propagation Rules

1. **Origin Service**: Catch and transform low-level errors
2. **Add Context**: Include service name and operation context
3. **Propagate Upward**: Pass to calling service with HTTP status
4. **Frontend Display**: Show user-friendly message

---

## Performance Considerations

### Caching Strategy

**U2 (Auth)**:
- Cache session tokens for 5 minutes
- Cache user profiles for 10 minutes

**U3 (Project)**:
- Cache project lists for 1 minute
- Cache project details for 5 minutes

**U4 (Spec)**:
- Cache specifications for 2 minutes
- No cache for currently editing specs

**U5 (CodeGen)**:
- Cache generated code for 30 minutes
- Invalidate on regeneration

**U6 (Validation)**:
- No caching (always validate latest)

### Timeout Configuration

```yaml
Auth: 5s
Project: 10s
Specification: 15s
Code Generation: 60s (longer timeout)
Validation: 30s
AI Service: 30s
```

---

## Monitoring and Observability

### Metrics to Track

**Per Unit**:
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- Dependency call latency

**Cross-Unit**:
- End-to-end transaction time
- Dependency failure impact
- Circuit breaker status

### Distributed Tracing

- Use AWS X-Ray or similar for request tracing
- Trace requests across all units
- Identify bottlenecks and failures

---

## Dependency Summary

**Most Depended Upon**:
1. U2 (Auth) - 5 dependents
2. U4 (Spec) - 3 dependents
3. U5 (CodeGen) - 1 dependent

**Most Dependencies**:
1. U6 (Validation) - 3 dependencies
2. U5 (CodeGen) - 3 dependencies
3. U4 (Spec) - 2 dependencies

**Independent Units**:
- U7 (AI) - No dependencies

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Status**: Complete