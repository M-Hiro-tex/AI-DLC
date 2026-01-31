# U2: Authentication Domain - NFR Design Patterns

## Overview

本ドキュメントでは、NFR要件を満たすために採用する具体的なデザインパターンと実装アプローチを定義します。

**Unit**: U2 - Authentication Domain  
**Technology Stack**: Node.js + TypeScript + Express  
**Database**: Aurora Serverless v2 PostgreSQL  
**Deployment**: Lambda/ECS Fargate

---

## 1. Resilience Patterns

### 1.1 Retry Pattern with Exponential Backoff

#### Purpose
OAuth プロバイダーやデータベースへの一時的な接続失敗に対する自動リカバリ

#### Implementation

```typescript
interface RetryConfig {
  maxAttempts: 3
  initialDelay: 100  // ms
  maxDelay: 2000     // ms
  jitterFactor: 0.2  // 20% jitter for preventing thundering herd
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  isRetryable: (error: Error) => boolean
): Promise<T> {
  let attempt = 0;
  let delay = config.initialDelay;
  
  while (attempt < config.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      
      if (!isRetryable(error) || attempt >= config.maxAttempts) {
        throw error;
      }
      
      // Add jitter: delay * (1 ± jitterFactor)
      const jitter = delay * config.jitterFactor * (Math.random() * 2 - 1);
      const actualDelay = delay + jitter;
      
      await sleep(actualDelay);
      
      // Exponential backoff: delay = min(delay * 2, maxDelay)
      delay = Math.min(delay * 2, config.maxDelay);
    }
  }
  
  throw new Error('Max retry attempts exceeded');
}
```

#### Retryable Errors
- **OAuth Provider Communication**:
  - Network timeouts (ETIMEDOUT, ECONNRESET)
  - 5xx server errors (500, 502, 503, 504)
  - Rate limit errors (429 Too Many Requests)
  
- **Database Operations**:
  - Connection timeouts
  - Deadlocks (PostgreSQL error code: 40P01)
  - Temporary unavailability

#### Non-Retryable Errors
- 4xx client errors (except 429)
- Authentication failures (401, 403)
- Invalid request format (400)
- Resource not found (404)

---

### 1.2 Circuit Breaker Pattern

#### Purpose
OAuth プロバイダーへの連続失敗時に、システム全体への影響を最小化し、回復を早める

#### Implementation: Opossum Library

**Library**: [opossum](https://github.com/nodeshift/opossum) - Node.js circuit breaker

```typescript
import CircuitBreaker from 'opossum';

interface CircuitBreakerConfig {
  timeout: 5000              // Request timeout (5 seconds)
  errorThresholdPercentage: 50  // Open when 50% of requests fail
  resetTimeout: 30000        // Try half-open after 30 seconds
  rollingCountTimeout: 10000 // Time window for error calculation (10 seconds)
  rollingCountBuckets: 10    // Number of buckets in time window
  volumeThreshold: 5         // Minimum requests before opening circuit
}

// Circuit breaker for OAuth provider calls
const oauthCircuitBreaker = new CircuitBreaker(
  fetchOAuthUserInfo,
  {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10,
    volumeThreshold: 5
  }
);

// Event handlers for monitoring
oauthCircuitBreaker.on('open', () => {
  logger.warn('Circuit breaker opened for OAuth provider');
  metrics.increment('circuit_breaker.oauth.open');
});

oauthCircuitBreaker.on('halfOpen', () => {
  logger.info('Circuit breaker half-open, testing OAuth provider');
  metrics.increment('circuit_breaker.oauth.half_open');
});

oauthCircuitBreaker.on('close', () => {
  logger.info('Circuit breaker closed for OAuth provider');
  metrics.increment('circuit_breaker.oauth.close');
});

// Usage
async function authenticateWithOAuth(provider: string, code: string) {
  try {
    const userInfo = await oauthCircuitBreaker.fire(provider, code);
    return userInfo;
  } catch (error) {
    if (oauthCircuitBreaker.opened) {
      // Circuit is open, fail fast
      throw new ServiceUnavailableError('OAuth provider temporarily unavailable');
    }
    throw error;
  }
}
```

#### Circuit Breaker States

**CLOSED (Normal Operation)**:
- All requests pass through
- Errors are counted
- Opens when error threshold is reached

**OPEN (Failing Fast)**:
- All requests immediately fail without calling OAuth provider
- Prevents cascading failures
- Reduces load on failing service
- Transitions to HALF_OPEN after reset timeout

**HALF_OPEN (Testing Recovery)**:
- Allows single test request
- If successful: Close circuit
- If fails: Open circuit again

#### Fallback Strategy

When circuit is open:
```typescript
fallback: async (provider: string, code: string) => {
  // Log the circuit breaker state
  logger.error('OAuth provider circuit breaker is open', { provider });
  
  // Return user-friendly error
  throw new ServiceUnavailableError(
    'Authentication service is temporarily unavailable. Please try again later.',
    { provider, retryAfter: 30 }
  );
}
```

---

### 1.3 Graceful Degradation

#### Purpose
システムの一部が失敗しても、可能な限り機能を提供し続ける

#### Degradation Scenarios

##### Scenario 1: OAuth Provider Unavailable

**Detection**:
- Circuit breaker opens
- Multiple consecutive OAuth failures

**Degradation Strategy**:
```typescript
async function handleOAuthProviderFailure(provider: string) {
  // 1. Log the incident
  logger.error('OAuth provider unavailable', { provider });
  
  // 2. Send alert to operations team
  await alerting.sendAlert({
    severity: 'HIGH',
    message: `OAuth provider ${provider} is unavailable`,
    service: 'auth-service'
  });
  
  // 3. Return clear error to user
  return {
    error: 'SERVICE_UNAVAILABLE',
    message: `Login with ${provider} is temporarily unavailable. Please try another login method or try again later.`,
    retryAfter: 30,
    alternativeProviders: getAlternativeProviders(provider)
  };
}
```

##### Scenario 2: Database Connection Issues

**Detection**:
- Connection timeouts
- Connection pool exhaustion
- Database health check failures

**Degradation Strategy**:
```typescript
async function handleDatabaseFailure() {
  // 1. Attempt connection with retry
  try {
    await withRetry(
      () => database.ping(),
      { maxAttempts: 3, initialDelay: 100, maxDelay: 500 },
      (error) => error.code === 'ECONNREFUSED'
    );
  } catch (error) {
    // 2. If retry fails, enter degraded mode
    logger.error('Database unavailable, entering degraded mode');
    
    // 3. Reject new authentications, allow JWT validation
    return {
      mode: 'DEGRADED',
      allowNewAuth: false,
      allowTokenValidation: true,  // JWT is stateless
      message: 'Authentication service is in maintenance mode'
    };
  }
}
```

##### Scenario 3: Session Validation Failure

**Strategy**: JWT-based stateless validation as fallback

```typescript
async function validateSession(accessToken: string): Promise<SessionInfo> {
  try {
    // Primary: JWT validation + database session check
    const jwtPayload = verifyJWT(accessToken);
    const session = await database.getSession(jwtPayload.sessionId);
    
    if (!session || session.revoked) {
      throw new SessionRevokedError();
    }
    
    return {
      userId: jwtPayload.sub,
      sessionId: jwtPayload.sessionId,
      source: 'DATABASE'
    };
    
  } catch (error) {
    if (error instanceof DatabaseConnectionError) {
      // Fallback: JWT-only validation (stateless)
      logger.warn('Database unavailable, using JWT-only validation');
      
      const jwtPayload = verifyJWT(accessToken);
      
      return {
        userId: jwtPayload.sub,
        sessionId: jwtPayload.sessionId,
        source: 'JWT_ONLY',
        degraded: true
      };
    }
    
    throw error;
  }
}
```

---

## 2. Performance Patterns

### 2.1 Caching Strategy

#### Session Validation Caching

**Strategy**: Stateless JWT Validation + Database for Revocation Check

```typescript
/**
 * Primary Strategy: JWT-based stateless validation
 * - JWT signature verification (no database lookup)
 * - Expiration check from JWT claims
 * - Fast validation (< 20ms)
 * 
 * Database Check: Only for revocation status
 * - Check if session is revoked in database
 * - Can be cached with short TTL if needed
 */

interface SessionValidationStrategy {
  // Step 1: Verify JWT (stateless, fast)
  verifyJWT(token: string): JWTPayload {
    // No database lookup needed
    // Signature verification only
    return jwt.verify(token, secretKey);
  }
  
  // Step 2: Check revocation status (database)
  async checkRevocation(sessionId: string): Promise<boolean> {
    // This is the only database call
    const session = await db.getSession(sessionId);
    return session?.revoked ?? false;
  }
  
  // Combined validation
  async validate(token: string): Promise<SessionInfo> {
    const payload = this.verifyJWT(token);  // Fast, stateless
    const revoked = await this.checkRevocation(payload.sessionId);  // DB check
    
    if (revoked) {
      throw new SessionRevokedError();
    }
    
    return {
      userId: payload.sub,
      sessionId: payload.sessionId,
      provider: payload.provider
    };
  }
}
```

**Performance Impact**:
- JWT verification: ~20ms (cryptographic operation)
- Database revocation check: ~50ms (indexed query)
- Total: ~70ms (well within < 100ms requirement)

**BFF Middleware Integration**:
```typescript
// Backend-for-Frontend (BFF) middleware for JWT validation
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return next();  // Public endpoint
  }
  
  try {
    // Stateless JWT validation in BFF
    const payload = verifyJWT(token);
    
    // Optional: Check revocation status from auth service
    // (Can be cached or called per-request based on requirements)
    if (req.headers['x-check-revocation'] === 'true') {
      const revoked = await authService.checkRevocation(payload.sessionId);
      if (revoked) {
        return res.status(401).json({ error: 'SESSION_REVOKED' });
      }
    }
    
    req.user = {
      userId: payload.sub,
      sessionId: payload.sessionId
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'INVALID_TOKEN' });
  }
});
```

#### User Profile Caching

**Strategy**: Short-term cache (5 minutes TTL) for frequently accessed profiles

```typescript
import NodeCache from 'node-cache';

const userProfileCache = new NodeCache({
  stdTTL: 300,        // 5 minutes
  checkperiod: 60,    // Check for expired keys every 60 seconds
  useClones: false    // Don't clone objects (better performance)
});

async function getUserProfile(userId: string): Promise<UserProfile> {
  // Check cache first
  const cached = userProfileCache.get<UserProfile>(userId);
  if (cached) {
    metrics.increment('user_profile.cache.hit');
    return cached;
  }
  
  // Cache miss - fetch from database
  metrics.increment('user_profile.cache.miss');
  const profile = await database.getUserById(userId);
  
  if (profile) {
    userProfileCache.set(userId, profile);
  }
  
  return profile;
}

// Cache invalidation on profile update
async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  await database.updateUser(userId, updates);
  
  // Invalidate cache
  userProfileCache.del(userId);
  
  logger.info('User profile cache invalidated', { userId });
}
```

**Cache Invalidation Triggers**:
- User profile update
- OAuth re-authentication (profile may have changed)
- Manual cache clear (admin operation)

---

### 2.2 Database Connection Pooling

**Strategy**: Dynamic connection pooling with Aurora Serverless v2

```typescript
import { Pool } from 'pg';

interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis: number;
}

function createDynamicPool(): Pool {
  const config: PoolConfig = {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: 300000,     // 5 minutes
    connectionTimeoutMillis: 30000, // 30 seconds
    acquireTimeoutMillis: 10000    // 10 seconds
  };
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: true },
    ...config
  });
  
  // Pool event monitoring
  pool.on('connect', (client) => {
    metrics.increment('db.pool.connections.created');
  });
  
  pool.on('acquire', (client) => {
    metrics.increment('db.pool.connections.acquired');
  });
  
  pool.on('remove', (client) => {
    metrics.increment('db.pool.connections.removed');
  });
  
  pool.on('error', (err, client) => {
    logger.error('Database pool error', { error: err.message });
    metrics.increment('db.pool.errors');
  });
  
  return pool;
}

// Dynamic adjustment based on load
async function adjustPoolSize(pool: Pool, metrics: PoolMetrics) {
  const utilizationThreshold = 0.8;  // 80% utilization
  const currentUtilization = metrics.activeConnections / pool.options.max;
  
  if (currentUtilization > utilizationThreshold) {
    // High utilization - consider increasing max
    logger.warn('High database pool utilization', {
      active: metrics.activeConnections,
      max: pool.options.max,
      utilization: currentUtilization
    });
    
    // Alert if approaching limits
    if (currentUtilization > 0.9) {
      await alerting.sendAlert({
        severity: 'WARNING',
        message: 'Database connection pool approaching limits',
        metrics: metrics
      });
    }
  }
}
```

---

### 2.3 Query Optimization Patterns

#### Index Strategy

```sql
-- User lookup by ID (primary key)
CREATE INDEX idx_users_id ON users(user_id);

-- Session lookup by ID
CREATE INDEX idx_sessions_id ON sessions(session_id);

-- Refresh token lookup (hashed)
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token_hash);

-- OAuth provider lookup
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id);

-- Active sessions per user
CREATE INDEX idx_sessions_user_active ON sessions(user_id, revoked, expires_at)
WHERE revoked = false AND expires_at > NOW();

-- Expired session cleanup
CREATE INDEX idx_sessions_expired ON sessions(expires_at)
WHERE revoked = false;
```

#### N+1 Query Prevention

```typescript
// Bad: N+1 query problem
async function getSessionsWithUsers(sessionIds: string[]) {
  const sessions = await db.getSessions(sessionIds);  // 1 query
  
  for (const session of sessions) {
    session.user = await db.getUser(session.userId);  // N queries
  }
  
  return sessions;
}

// Good: Join or batch query
async function getSessionsWithUsers(sessionIds: string[]) {
  // Single query with JOIN
  const query = `
    SELECT s.*, u.*
    FROM sessions s
    JOIN users u ON s.user_id = u.user_id
    WHERE s.session_id = ANY($1)
  `;
  
  return await db.query(query, [sessionIds]);
}
```

---

## 3. Scalability Patterns

### 3.1 Stateless Application Pattern

**Design Principle**: No server-side session affinity required

```typescript
/**
 * Stateless Design Checklist:
 * - Session storage in database (not in-memory)
 * - JWT for stateless authentication
 * - No sticky sessions required
 * - Horizontally scalable
 */

// Session storage: Database (not in-memory)
interface SessionStorage {
  // NEVER: in-memory storage
  // ❌ const sessions = new Map<string, Session>();
  
  // ALWAYS: database storage
  async saveSession(session: Session): Promise<void> {
    await database.insertSession(session);
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    return await database.getSession(sessionId);
  }
}

// JWT stateless validation
interface StatelessValidation {
  // No database lookup for every validation
  validateAccessToken(token: string): JWTPayload {
    return jwt.verify(token, secretKey);  // Stateless
  }
  
  // Database check only for revocation
  async checkRevocation(sessionId: string): Promise<boolean> {
    return await database.isSessionRevoked(sessionId);
  }
}
```

---

### 3.2 Horizontal Scaling Pattern

**Load Balancing Strategy**: Application Load Balancer (ALB)

```yaml
Load Balancer Configuration:
  Type: Application Load Balancer (ALB)
  Scheme: Internet-facing
  Listeners:
    - Port: 443
      Protocol: HTTPS
      Certificate: ACM managed
  Target Group:
    Protocol: HTTP
    Port: 3000
    HealthCheck:
      Path: /health
      Interval: 30s
      Timeout: 5s
      HealthyThreshold: 2
      UnhealthyThreshold: 2
  Routing:
    Algorithm: Round Robin (default)
    Stickiness: Disabled (stateless application)
```

**Auto-Scaling Configuration**:

```yaml
Auto Scaling Group:
  MinSize: 2  # Production
  MaxSize: 10
  DesiredCapacity: 2
  CooldownPeriod: 300  # 5 minutes
  
  ScalingPolicies:
    - Name: ScaleOutOnCPU
      Type: TargetTrackingScaling
      MetricType: CPUUtilization
      TargetValue: 70
      
    - Name: ScaleOutOnMemory
      Type: TargetTrackingScaling
      MetricType: MemoryUtilization
      TargetValue: 80
      
    - Name: ScaleOutOnRequestCount
      Type: TargetTrackingScaling
      MetricType: RequestCountPerTarget
      TargetValue: 1000
```

---

## 4. Security Patterns

### 4.1 Secrets Management Pattern

**AWS Secrets Manager Integration with Caching**

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface SecretCache {
  value: any;
  expiresAt: number;
}

class SecretsManager {
  private client: SecretsManagerClient;
  private cache: Map<string, SecretCache>;
  private cacheTTL: number = 5 * 60 * 1000;  // 5 minutes
  
  constructor() {
    this.client = new SecretsManagerClient({ region: 'ap-northeast-1' });
    this.cache = new Map();
  }
  
  async getSecret(secretName: string): Promise<any> {
    // Check cache first
    const cached = this.cache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      metrics.increment('secrets.cache.hit');
      return cached.value;
    }
    
    // Cache miss - fetch from Secrets Manager
    metrics.increment('secrets.cache.miss');
    
    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);
      
      const value = JSON.parse(response.SecretString || '{}');
      
      // Cache with TTL
      this.cache.set(secretName, {
        value,
        expiresAt: Date.now() + this.cacheTTL
      });
      
      return value;
      
    } catch (error) {
      logger.error('Failed to fetch secret', { secretName, error });
      throw new SecretsFetchError('Unable to retrieve secret');
    }
  }
  
  // Manual cache invalidation (for secret rotation)
  invalidate(secretName: string): void {
    this.cache.delete(secretName);
    logger.info('Secret cache invalidated', { secretName });
  }
}

// Usage
const secretsManager = new SecretsManager();

async function getOAuthCredentials(provider: string): Promise<OAuthCredentials> {
  const secretName = `${provider}-oauth-credentials`;
  return await secretsManager.getSecret(secretName);
}
```

**Secret Rotation Handling**:

```typescript
// Listen for secret rotation events
async function handleSecretRotation(event: SecretRotationEvent) {
  const { secretName, rotationStep } = event;
  
  switch (rotationStep) {
    case 'createSecret':
      // AWS rotates the secret
      break;
      
    case 'setSecret':
      // Test new secret works
      await testNewSecret(secretName);
      break;
      
    case 'testSecret':
      // Verify application can use new secret
      secretsManager.invalidate(secretName);
      await getSecret(secretName);  // Force re-fetch
      break;
      
    case 'finishSecret':
      // Rotation complete
      logger.info('Secret rotation complete', { secretName });
      break;
  }
}
```

---

### 4.2 Rate Limiting Pattern

**Multi-Layer Rate Limiting with Upstash Redis**

```typescript
import Redis from 'ioredis';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Upstash Redis connection
const redis = new Redis(process.env.UPSTASH_REDIS_URL, {
  tls: {
    rejectUnauthorized: true
  }
});

// Layer 3: Application-level rate limiting with distributed storage
const createRateLimiter = (config: RateLimitConfig) => {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: `rate-limit:${config.name}:`
    }),
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: config.keyGenerator || ((req) => req.ip),
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        endpoint: req.path,
        ip: req.ip,
        userId: req.user?.userId
      });
      
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    }
  });
};

// Login endpoint rate limit (per IP)
const loginLimiter = createRateLimiter({
  name: 'login',
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  message: 'Too many login attempts. Please try again later.'
});

// Token refresh rate limit (per user)
const refreshLimiter = createRateLimiter({
  name: 'refresh',
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,
  message: 'Too many token refresh requests.',
  keyGenerator: (req) => req.user?.userId || req.ip
});

// Apply rate limiters
app.post('/api/auth/login', loginLimiter, handleLogin);
app.post('/api/auth/refresh', refreshLimiter, handleRefresh);
```

---

### 4.3 Secure Token Management

**JWT Signing and Verification**

```typescript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

class TokenManager {
  private jwtSecret: string;
  
  async initialize() {
    // Fetch JWT secret from Secrets Manager (cached for 5 minutes)
    const secrets = await secretsManager.getSecret('jwt-signing-secret');
    this.jwtSecret = secrets.secret;
  }
  
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(
      {
        iss: 'aidlc-auth-service',
        sub: payload.userId,
        sessionId: payload.sessionId,
        provider: payload.provider
      },
      this.jwtSecret,
      {
        algorithm: 'HS256',
        expiresIn: '3h'
      }
    );
  }
  
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'aidlc-auth-service'
      });
      
      return decoded as TokenPayload;
      
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError();
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new InvalidTokenError();
      }
      throw error;
    }
  }
  
  generateRefreshToken(): string {
    // Opaque token: 32 random bytes, base64 encoded
    return crypto.randomBytes(32).toString('base64');
  }
  
  hashRefreshToken(token: string): string {
    // SHA-256 hash for storage
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
```

---

## 5. Observability Patterns

### 5.1 Structured Logging Pattern

**JSON Structured Logging with Winston**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',  // Dynamic level via environment variable
  format: winston.format.combine(
    winston.format.timestamp({ format: 'ISO' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'auth-service',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.CloudWatch({
      logGroupName: '/aws/lambda/auth-service',
      logStreamName: () => new Date().toISOString().split('T')[0]
    })
  ]
});

// Correlation ID middleware
app.use((req, res, next) => {
  // Use X-Ray trace ID as correlation ID
  req.correlationId = req.headers['x-amzn-trace-id'] || 
                       process.env._X_AMZN_TRACE_ID ||
                       uuid.v4();
  
  // Add to all logs in this request
  req.logger = logger.child({ correlationId: req.correlationId });
  
  next();
});

// Usage in handlers
app.post('/api/auth/login', async (req, res) => {
  req.logger.info('Login attempt started', {
    provider: req.body.provider,
    ip: req.ip
  });
  
  try {
    const result = await authenticateUser(req.body);
    
    req.logger.info('Login successful', {
      userId: result.userId,
      provider: result.provider,
      duration: result.duration
    });
    
    res.json(result);
    
  } catch (error) {
    req.logger.error('Login failed', {
      error: error.message,
      stack: error.stack,
      provider: req.body.provider
    });
    
    res.status(401).json({ error: 'LOGIN_FAILED' });
  }
});
```

**Sensitive Data Redaction**:

```typescript
// Custom formatter to redact sensitive data
const redactSensitiveData = winston.format((info) => {
  const sensitiveFields = ['password', 'token', 'secret', 'authorization'];
  
  const redact = (obj: any) => {
    if (typeof obj !==