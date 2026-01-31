# U2: Authentication Domain - Tech Stack Decisions

## Overview

本ドキュメントでは、Authentication Domain（U2）の技術スタック選定の理由と決定事項を記録します。各技術選択は、NFR要件と機能要件を満たすために行われました。

**Decision Date**: 2026-02-01  
**Review Cycle**: Quarterly (or as needed)

---

## Technology Stack Summary

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Runtime** | Node.js | 20.x LTS | Performance, ecosystem, TypeScript support |
| **Language** | TypeScript | 5.x | Type safety, maintainability, IDE support |
| **Framework** | Express.js | 4.x | Proven, flexible, middleware ecosystem |
| **Database** | Aurora Serverless v2 (PostgreSQL) | 15.x compatible | Auto-scaling, cost-effective, ACID compliance |
| **Authentication** | OAuth 2.0 | - | Industry standard, provider support |
| **Token Management** | JWT (jsonwebtoken) + Custom | - | Stateless access, secure refresh |
| **Deployment** | AWS Lambda / ECS Fargate | - | Serverless, scalable, managed |
| **API Gateway** | AWS API Gateway | - | Managed, WAF integration, rate limiting |
| **Secrets** | AWS Secrets Manager | - | Automatic rotation, secure storage |
| **Monitoring** | CloudWatch + X-Ray | - | AWS native, distributed tracing |
| **Load Balancing** | Application Load Balancer (ALB) | - | Layer 7 routing, health checks |

---

## 1. Runtime and Language Decisions

### Decision: Node.js 20.x LTS

#### Rationale
- **Performance**: V8 engine provides excellent performance for I/O-bound operations
- **Ecosystem**: Rich npm ecosystem with extensive OAuth and JWT libraries
- **TypeScript Support**: First-class TypeScript support through native tooling
- **Async/Await**: Modern async patterns simplify authentication flows
- **Lambda Support**: Native support for AWS Lambda serverless deployment
- **Developer Familiarity**: Large developer community and abundant resources

#### Alternatives Considered
- **Python**: Considered but Node.js performs better for concurrent I/O operations
- **Java**: More verbose, slower cold starts in Lambda environment
- **Go**: Better performance but smaller ecosystem and less developer familiarity

#### NFR Alignment
- ✅ **Performance**: Sub-second response times achievable
- ✅ **Scalability**: Excellent for horizontal scaling
- ✅ **Maintainability**: Large ecosystem, good tooling

---

### Decision: TypeScript 5.x

#### Rationale
- **Type Safety**: Catch errors at compile time, reducing runtime bugs
- **IDE Support**: Excellent IntelliSense, refactoring, and navigation
- **Maintainability**: Self-documenting code, easier to understand business logic
- **OAuth API Typing**: Strong typing for OAuth provider responses
- **Refactoring**: Safe refactoring across large codebase
- **Team Productivity**: Faster development with autocomplete and type checking

#### Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist"
  }
}
```

#### NFR Alignment
- ✅ **Maintainability**: 80% test coverage easier with types
- ✅ **Reliability**: Type checking prevents many runtime errors
- ✅ **Developer Experience**: Better tooling and productivity

---

## 2. Framework Decision

### Decision: Express.js 4.x

#### Rationale
- **Maturity**: Battle-tested framework with 10+ years of production use
- **Flexibility**: Minimal opinionation allows custom authentication flows
- **Middleware Ecosystem**: Rich middleware for logging, CORS, rate limiting
- **OAuth Integration**: Well-documented OAuth middleware (Passport.js)
- **Lambda Support**: Works well with serverless-http adapter
- **Community**: Large community, abundant examples and troubleshooting resources

#### Key Middleware
- **helmet**: Security headers
- **cors**: Cross-origin resource sharing
- **express-rate-limit**: Application-level rate limiting
- **morgan**: HTTP request logging
- **express-validator**: Request validation

#### Alternatives Considered
- **Fastify**: Better performance but smaller ecosystem
- **Nest.js**: Too opinionated for simple authentication service
- **AWS API Gateway + Lambda**: Considered but Express provides more flexibility

#### NFR Alignment
- ✅ **Performance**: Meets < 1s response time requirement
- ✅ **Scalability**: Stateless, scales horizontally
- ✅ **Maintainability**: Well-known framework, easy to hire developers

---

## 3. Database Decision

### Decision: Aurora Serverless v2 (PostgreSQL-compatible)

#### Rationale
- **Auto-Scaling**: Scales to zero during low usage (cost-effective for MVP)
- **ACID Compliance**: Strong consistency for session management
- **Instant Scaling**: Sub-second scaling response time
- **PostgreSQL Compatibility**: Rich feature set (JSON, full-text search)
- **Managed Service**: AWS handles backups, patching, high availability
- **Multi-AZ**: Built-in failover for production environment
- **Cost Efficiency**: Pay per use, ideal for variable workload

#### Configuration
```yaml
Aurora Serverless v2:
  Engine: aurora-postgresql
  Version: 15.x
  ACU Range:
    Min: 0.5 ACU (MVP)
    Max: 16 ACU (growth)
  Backup:
    Retention: 7 days
    Window: 03:00-04:00 JST
  Multi-AZ: true (Production only)
```

#### Schema Design Considerations
- **User Table**: Stores OAuth user profiles
- **Session Table**: Stores active sessions and refresh tokens
- **OAuth State Table**: Temporary storage for OAuth state tokens
- **Indexes**: Optimized for userId, sessionId, refreshToken lookups

#### Alternatives Considered
- **DynamoDB**: Considered but ACID transactions needed for session consistency
- **RDS Provisioned**: Higher cost, manual scaling
- **Aurora Serverless v1**: Slower scaling, cold start issues

#### NFR Alignment
- ✅ **Performance**: < 50ms query times with proper indexing
- ✅ **Scalability**: Auto-scales from 0.5 to 16 ACU
- ✅ **Availability**: 99.9% with Multi-AZ failover
- ✅ **Cost**: $50-100/month for MVP scale

---

## 4. Authentication Strategy Decisions

### Decision: OAuth 2.0 (Google + GitHub)

#### Rationale
- **Industry Standard**: Well-understood protocol, extensive documentation
- **Security**: Delegates authentication to trusted providers
- **User Experience**: Users don't need to create new passwords
- **Provider Support**: Google and GitHub provide robust OAuth APIs
- **Scope**: Minimal scope (email, profile) for privacy

#### OAuth Flow: Authorization Code Flow

**Why Authorization Code Flow?**
- Most secure OAuth flow for web applications
- Server-side token exchange (client secret never exposed)
- Supports refresh tokens for long-lived sessions

#### Provider-Specific Configuration

##### Google OAuth
```typescript
{
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: 'https://api.example.com/auth/google/callback',
  scope: ['openid', 'email', 'profile'],
  endpoints: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo'
  }
}
```

##### GitHub OAuth
```typescript
{
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  redirectUri: 'https://api.example.com/auth/github/callback',
  scope: ['user:email', 'read:user'],
  endpoints: {
    authorize: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    userInfo: 'https://api.github.com/user'
  }
}
```

#### NFR Alignment
- ✅ **Security**: Industry-standard protocol, proven security
- ✅ **User Experience**: Familiar login experience
- ✅ **Maintainability**: Well-documented, easy to extend

---

### Decision: Hybrid Token Strategy (JWT + Opaque)

#### Access Token: JWT (JSON Web Token)

**Rationale for JWT**:
- **Stateless**: No database lookup needed for validation
- **Self-Contained**: Contains user ID, session ID, expiration
- **Performance**: Fast validation (signature check only)
- **Standard**: RFC 7519 standard, extensive library support

**JWT Configuration**:
```typescript
{
  algorithm: 'HS256',           // HMAC with SHA-256
  expiresIn: '3h',              // 3 hour expiration
  issuer: 'aidlc-auth-service',
  secret: process.env.JWT_SECRET // Stored in AWS Secrets Manager
}
```

**JWT Payload Structure**:
```typescript
{
  iss: 'aidlc-auth-service',    // Issuer
  sub: 'user-uuid',              // Subject (User ID)
  iat: 1704067200,               // Issued at
  exp: 1704078000,               // Expiration (3 hours)
  sessionId: 'session-uuid',     // Session identifier
  provider: 'google'             // OAuth provider
}
```

#### Refresh Token: Opaque Token

**Rationale for Opaque**:
- **Revocability**: Can be revoked immediately in database
- **Security**: Cannot be decoded or tampered with
- **Long-Lived**: 30-day expiration for better UX
- **Rotation**: Can be rotated on each refresh for extra security

**Opaque Token Generation**:
```typescript
{
  method: 'crypto.randomBytes(32)',
  encoding: 'base64',
  storage: 'Hashed (SHA-256) in database',
  expiration: '30 days'
}
```

#### Why Hybrid Strategy?

| Aspect | JWT (Access) | Opaque (Refresh) |
|--------|-------------|------------------|
| **Performance** | Fast (no DB) | Slower (DB lookup) |
| **Revocability** | Difficult | Immediate |
| **Lifetime** | Short (3h) | Long (30d) |
| **Use Case** | Frequent API calls | Token refresh only |
| **Security** | Self-contained | Fully controlled |

#### NFR Alignment
- ✅ **Performance**: JWT enables < 100ms session validation
- ✅ **Security**: Opaque tokens provide revocation capability
- ✅ **User Experience**: 30-day refresh token reduces re-authentication

---

## 5. Deployment Strategy Decisions

### Decision: AWS Lambda / ECS Fargate (Hybrid)

#### Initial Deployment: AWS Lambda

**Rationale for Lambda (MVP)**:
- **Cost**: Pay per request, no idle costs
- **Scaling**: Automatic, instant scaling
- **Management**: Fully managed, no server management
- **Integration**: Native API Gateway integration
- **Development Speed**: Faster time to market

**Lambda Configuration**:
```yaml
Runtime: nodejs20.x
Memory: 512 MB
Timeout: 30 seconds
Reserved Concurrency: 10 (production)
Environment Variables:
  - NODE_ENV
  - JWT_SECRET (from Secrets Manager)
  - DATABASE_URL (from Secrets Manager)
```

#### Future Migration: ECS Fargate (If Needed)

**When to Consider ECS Fargate**:
- Lambda cold starts become problematic (> 1s)
- Need for persistent connections (WebSockets)
- Request durations consistently > 30 seconds
- Complex deployment dependencies

**ECS Fargate Benefits**:
- No cold starts
- More predictable performance
- Persistent connections supported
- Full container control

#### Deployment Pipeline
```
GitHub → GitHub Actions → Build Docker Image → Push to ECR
  ↓
Deploy to Lambda (initial) or ECS Fargate (future)
  ↓
Health Check → Route Traffic → Monitor
```

#### NFR Alignment
- ✅ **Scalability**: Auto-scaling to meet demand
- ✅ **Cost**: Efficient for MVP scale
- ✅ **Availability**: Multi-AZ deployment in production

---

### Decision: AWS API Gateway

#### Rationale
- **Managed Service**: No infrastructure management
- **WAF Integration**: Multi-layer security (see rate limiting)
- **Request Validation**: JSON schema validation
- **CORS Support**: Built-in CORS handling
- **Logging**: CloudWatch Logs integration
- **Throttling**: Built-in rate limiting
- **Custom Domain**: Custom domain with ACM certificates

#### API Gateway Configuration
```yaml
Type: REST API (not HTTP API - need advanced features)
Endpoint: Regional
Stages:
  - dev: Development environment
  - staging: Pre-production testing
  - prod: Production environment
Features:
  - Request validation
  - Response caching (optional)
  - API keys (future)
  - Usage plans (future)
```

#### NFR Alignment
- ✅ **Security**: WAF, throttling, request validation
- ✅ **Performance**: Edge-optimized latency
- ✅ **Scalability**: Managed scaling

---

## 6. Security Decisions

### Decision: AWS Secrets Manager

#### Rationale
- **Automatic Rotation**: Scheduled rotation for JWT secret
- **Encryption**: KMS encryption at rest
- **Access Control**: IAM-based access control
- **Audit**: CloudTrail logging of secret access
- **Integration**: Native Lambda/ECS integration

#### Secrets Stored
```yaml
Secrets:
  - google-oauth-credentials:
      clientId: "xxx"
      clientSecret: "yyy"
  - github-oauth-credentials:
      clientId: "xxx"
      clientSecret: "yyy"
  - jwt-signing-secret:
      secret: "auto-rotated-every-90-days"
  - database-credentials:
      host: "aurora-endpoint"
      username: "admin"
      password: "auto-rotated-every-60-days"
```

#### Rotation Strategy
- **JWT Secret**: Rotate every 90 days (dual signing period for gradual rollover)
- **Database Credentials**: Aurora automatic rotation every 60 days
- **OAuth Secrets**: Manual rotation when provider credentials change

#### Alternatives Considered
- **SSM Parameter Store**: Lower cost but no automatic rotation
- **Environment Variables**: Not secure, no rotation support

#### NFR Alignment
- ✅ **Security**: Automatic rotation, encryption, audit
- ✅ **Compliance**: Meets security best practices
- ✅ **Maintainability**: Managed rotation, no manual intervention

---

### Decision: Multi-Layer Rate Limiting (WAF + API Gateway + Application)

#### Layer 1: AWS WAF
```yaml
Rule: IP-based global rate limit
Limit: 100 requests per 5 minutes per IP
Action: Block and return 429
Purpose: DDoS protection
```

#### Layer 2: API Gateway
```yaml
Throttle: 50 requests per second (future with API keys)
Burst: 100 requests
Purpose: API-level protection
```

#### Layer 3: Application (Express Middleware)
```typescript
// Authentication endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window per IP
  message: 'Too many login attempts, please try again later'
});

// Token refresh endpoint
const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour per user
  keyGenerator: (req) => req.user.userId
});
```

#### Rationale
- **Defense in Depth**: Multiple layers prevent abuse
- **Granular Control**: Different limits for different endpoints
- **DDoS Protection**: WAF blocks malicious traffic early
- **User Protection**: Prevents brute force attacks

#### NFR Alignment
- ✅ **Security**: Multi-layer defense against attacks
- ✅ **Availability**: Prevents resource exhaustion
- ✅ **Performance**: Blocks malicious traffic before reaching application

---

## 7. Monitoring and Observability Decisions

### Decision: CloudWatch + X-Ray

#### CloudWatch for Metrics and Logs

**Rationale**:
- **Native Integration**: Works seamlessly with Lambda, ECS, RDS
- **Custom Metrics**: Application-specific metrics (auth success/failure)
- **Log Aggregation**: Centralized logging from all components
- **Alarms**: Automated alerting based on thresholds
- **Cost**: No additional cost for basic monitoring

**Key Metrics**:
```yaml
Application Metrics:
  - AuthenticationSuccess (count)
  - AuthenticationFailure (count)
  - SessionValidationLatency (milliseconds)
  - TokenRefreshLatency (milliseconds)
  - OAuthProviderLatency (milliseconds)

Infrastructure Metrics:
  - Lambda concurrent executions
  - Lambda duration
  - Lambda errors
  - Aurora CPU utilization
  - Aurora connections
```

#### X-Ray for Distributed Tracing

**Rationale**:
- **End-to-End Tracing**: Track requests across Lambda, API Gateway, RDS
- **Service Map**: Visualize dependencies and bottlenecks
- **Performance Analysis**: Identify slow components
- **Error Analysis**: Trace errors to root cause
- **Sampling**: Configurable sampling to control costs

**Tracing Strategy**:
```yaml
Sampling Rate:
  - 100% for errors
  - 10% for successful requests (production)
  - 100% for all requests (staging)
Trace Segments:
  - API Gateway
  - Lambda function
  - OAuth provider call
  - Database query
```

#### Alternatives Considered
- **Datadog**: More features but additional cost ($15+/host/month)
- **New Relic**: Good APM but overkill for MVP
- **CloudWatch only**: No distributed tracing

#### Decision: Standard Monitoring (CloudWatch + X-Ray)
- Based on user answer: "B) 標準：CloudWatch + X-Ray（分散トレーシング）"
- Provides good balance of visibility and cost
- Can upgrade to third-party APM in future if needed

#### NFR Alignment
- ✅ **Reliability**: 99.9% uptime monitoring
- ✅ **Performance**: P95 latency tracking
- ✅ **Maintainability**: Root cause analysis capabilities

---

## 8. Infrastructure as Code Decision

### Decision: Terraform (or AWS CDK)

#### Rationale
- **Version Control**: Infrastructure changes tracked in Git
- **Repeatability**: Consistent deployments across environments
- **Documentation**: Infrastructure is self-documenting
- **Disaster Recovery**: Rebuild infrastructure from code
- **Multi-Environment**: Easy to create dev/staging/prod environments

#### Infrastructure Components to Codify
```
├── vpc.tf              # VPC, subnets, security groups
├── database.tf         # Aurora Serverless cluster
├── lambda.tf           # Lambda functions
├── api-gateway.tf      # API Gateway configuration
├── waf.tf              # WAF rules
├── secrets.tf          # Secrets Manager
├── cloudwatch.tf       # Alarms and dashboards
├── iam.tf              # IAM roles and policies
└── outputs.tf          # Output values
```

#### NFR Alignment
- ✅ **Maintainability**: Infrastructure changes reviewable
- ✅ **Disaster Recovery**: Quick rebuild capability
- ✅ **Compliance**: Audit trail of infrastructure changes

---

## 9. Testing Strategy Decisions

### Decision: Jest + Supertest + AWS SDK Mock

#### Unit Testing: Jest
```typescript
Coverage Target: 80%
Focus Areas:
  - Business logic (100% coverage)
  - OAuth token exchange
  - JWT generation and validation
  - Session management
  - Error handling
```

#### Integration Testing: Supertest
```typescript
Test Scenarios:
  - Complete OAuth flows (Google, GitHub)
  - Session creation and validation
  - Token refresh
  - Session termination
  - Error scenarios
```

#### AWS Service Mocking: aws-sdk-mock
```typescript
Mock Services:
  - Secrets Manager (for credentials)
  - RDS Data API (for database)
  - CloudWatch Logs
```

#### NFR Alignment
- ✅ **Maintainability**: 80% test coverage requirement met
- ✅ **Reliability**: Critical paths fully tested
- ✅ **Developer Experience**: Fast feedback loop

---

## 10. Future Technology Considerations

### Potential Future Upgrades

#### When to Consider Migration to ECS Fargate
- Lambda cold starts consistently > 500ms
- Need for WebSocket connections
- Request durations > 30 seconds

#### When to Add Read Replicas
- Read/write ratio > 3:1
- Database CPU consistently > 70%
- Query latency degradation

#### When to Add Caching (Redis/ElastiCache)
- User profile queries > 1000/second
- Session validation latency > 100ms
- Database connections exhausted

#### When to Upgrade Monitoring (Third-Party APM)
- Need advanced features (user session replay, error tracking)
- CloudWatch Logs become expensive (> $100/month)
- Need better visualization and collaboration

---

## Technology Decision Summary

| Decision | Choice | Rationale | NFR Impact |
|----------|--------|-----------|------------|
| **Runtime** | Node.js 20.x | Performance, ecosystem | Performance ✅ |
| **Language** | TypeScript 5.x | Type safety, maintainability | Maintainability ✅ |
| **Framework** | Express.js 4.x | Maturity, flexibility | All ✅ |
| **Database** | Aurora Serverless v2 | Auto-scaling, cost | Scalability ✅ Cost ✅ |
| **Auth Protocol** | OAuth 2.0 | Industry standard | Security ✅ |
| **Token Strategy** | JWT + Opaque | Performance + Security | Performance ✅ Security ✅ |
| **Deployment** | Lambda → Fargate | Cost-effective start | Cost ✅ Scalability ✅ |
| **API Gateway** | AWS API Gateway | Managed, WAF integration | Security ✅ |
| **Secrets** | Secrets Manager | Auto-rotation | Security ✅ |
| **Monitoring** | CloudWatch + X-Ray | Native, cost-effective | Observability ✅ |
| **Rate Limiting** | WAF + Gateway + App | Multi-layer defense | Security ✅ |
| **IaC** | Terraform/CDK | Version control, DR | Maintainability ✅ |

---

## Review and Updates

**Next Review**: 2026-05-01 (Quarterly)  
**Review Triggers**:
- User base exceeds 500 (growth milestone)
- Performance degradation (P95 > 2s)
- Cost exceeds budget (> $300/month)
- New AWS services relevant to authentication
- Security vulnerabilities in dependencies

**Change Process**:
1. Propose change with rationale
2. Impact analysis on NFRs
3. Team review and approval
4. Update this document
5. Implement and validate

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Last Updated**: 2026-02-01  
**Status**: Complete