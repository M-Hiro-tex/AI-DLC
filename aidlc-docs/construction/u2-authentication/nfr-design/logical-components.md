# U2: Authentication Domain - Logical Components

## Overview

本ドキュメントでは、NFR要件を満たすために必要な論理コンポーネント（infrastructure components）を定義します。これらは具体的なAWSサービスへのマッピングを Infrastructure Design フェーズで行います。

**Unit**: U2 - Authentication Domain  
**Purpose**: Define logical infrastructure components needed to support NFR patterns

---

## 1. Caching Layer (Logical Component)

### 1.1 User Profile Cache

#### Purpose
ユーザープロファイル取得のパフォーマンス向上

#### Type
In-Memory Cache (Application-level)

#### Responsibility
- ユーザープロファイルデータの一時保存
- キャッシュヒット/ミスの管理
- TTLベースの自動無効化

#### Data Stored
```typescript
interface CachedUserProfile {
  userId: string;
  email: string;
  displayName: string;
  profilePictureUrl?: string;
  oauthProvider: string;
  cachedAt: number;
}
```

#### Configuration
- **TTL**: 5 minutes (300 seconds)
- **Max Size**: 1000 entries
- **Eviction Policy**: LRU (Least Recently Used)
- **Storage**: Node.js in-memory (per instance)

#### Cache Invalidation
- Profile update operations
- OAuth re-authentication
- Manual admin operation

---

### 1.2 Rate Limiting Store

#### Purpose
分散環境でのレート制限状態管理

#### Type
Distributed Cache (Upstash Redis)

#### Responsibility
- リクエストカウントの追跡
- タイムウィンドウ管理
- 全インスタンス間での状態共有

#### Data Stored
```typescript
interface RateLimitEntry {
  key: string;        // IP address or user ID
  count: number;      // Request count in window
  windowStart: number; // Window start timestamp
  expiresAt: number;  // TTL expiration
}
```

#### Configuration
- **Provider**: Upstash Redis (serverless, pay-per-request)
- **Region**: ap-northeast-1 (Tokyo)
- **TLS**: Required
- **Persistence**: Not required (ephemeral data)

#### Key Patterns
```
rate-limit:login:{IP}        # Login attempts per IP
rate-limit:refresh:{userId}  # Token refresh per user
rate-limit:profile:{userId}  # Profile access per user
```

---

### 1.3 Secrets Cache

#### Purpose
Secrets Manager APIコールの削減とパフォーマンス向上

#### Type
In-Memory Cache (Application-level)

#### Responsibility
- Secrets Manager secrets の一時保存
- 短期TTLでのキャッシュ
- 手動invalidation対応

#### Data Stored
```typescript
interface CachedSecret {
  secretName: string;
  value: any;         // Parsed JSON secret value
  cachedAt: number;
  expiresAt: number;
}
```

#### Configuration
- **TTL**: 5 minutes
- **Max Size**: 10 secrets
- **Eviction**: Manual invalidation + TTL
- **Storage**: Node.js in-memory (per instance)

#### Cached Secrets
- OAuth client credentials (Google, GitHub)
- JWT signing secret
- Database credentials

---

## 2. Message Queue (Logical Component)

### 2.1 Async Processing Queue

#### Purpose
非同期処理タスクのオフロード

#### Type
Lightweight Async Processing

#### Responsibility
- 非同期タスクの実行
- タスク失敗時のリトライ
- タスク状態の追跡

#### Implementation Approach
**Lambda Async Invocation** (軽量アプローチ)

#### Use Cases
```typescript
interface AsyncTasks {
  // Email notifications (future)
  sendWelcomeEmail: {
    userId: string;
    email: string;
  };
  
  // Audit log processing
  logAuthenticationEvent: {
    userId: string;
    eventType: string;
    timestamp: number;
    metadata: any;
  };
  
  // Session cleanup (background task)
  cleanupExpiredSessions: {
    olderThan: number;
  };
}
```

#### Configuration
```typescript
const asyncConfig = {
  invocationType: 'Event',  // Fire-and-forget
  maxRetries: 3,
  retryDelay: 1000,         // 1 second
  timeout: 30000            // 30 seconds
};
```

#### Future Migration Path
If async processing requirements grow:
- **SQS**: Standard queue for reliable message processing
- **SNS**: Pub/sub for multiple subscribers
- **EventBridge**: Event-driven architecture

---

## 3. API Gateway (Logical Component)

### 3.1 Purpose
API エンドポイントの統一管理と保護

### 3.2 Responsibilities

#### Request Routing
- OAuth認証エンドポイント
- セッション管理エンドポイント
- ユーザープロファイルエンドポイント

#### Request Validation
```typescript
interface RequestValidation {
  // JSON schema validation
  validateRequestBody: boolean;
  
  // Parameter validation
  validateQueryParams: boolean;
  validatePathParams: boolean;
  
  // Header validation
  requiredHeaders: string[];
}
```

#### Request Transformation
- Add correlation ID header
- Add timestamp header
- Normalize request format

#### Response Transformation
- Add CORS headers
- Add rate limit headers
- Standardize error format

### 3.3 Security Integration

#### AWS WAF Integration
```yaml
WAF Rules:
  - RateLimitRule:
      Limit: 100 requests per 5 minutes per IP
      Action: Block
      
  - SQLInjectionRule:
      Action: Block
      
  - XSSProtectionRule:
      Action: Block
      
  - KnownBadInputsRule:
      Action: Block
```

#### API Gateway Throttling
```yaml
Throttling:
  BurstLimit: 100 requests
  RateLimit: 50 requests per second
  
  PerMethodThrottling:
    POST /auth/login:
      BurstLimit: 20
      RateLimit: 10
    POST /auth/refresh:
      BurstLimit: 50
      RateLimit: 20
```

### 3.4 Configuration

```yaml
API Gateway:
  Type: REST API
  EndpointType: Regional
  
  Stages:
    - dev   # 開発環境（dev + staging統合）
    - prod  # 本番環境
  
  Features:
    - Request validation
    - CORS configuration
    - API keys (future)
    - Usage plans (future)
    - Request/response logging
```

---

## 4. Monitoring and Alerting Infrastructure (Logical Component)

### 4.1 Metrics Aggregation

#### Purpose
アプリケーションとインフラストラクチャのメトリクス収集

#### Metric Categories

##### Application Metrics
```typescript
interface ApplicationMetrics {
  // Authentication metrics
  authenticationAttempts: Counter;
  authenticationSuccesses: Counter;
  authenticationFailures: Counter;
  authenticationLatency: Histogram;
  
  // Session metrics
  sessionCreations: Counter;
  sessionValidations: Counter;
  sessionRevocations: Counter;
  sessionValidationLatency: Histogram;
  
  // Token metrics
  tokenRefreshes: Counter;
  tokenRefreshLatency: Histogram;
  
  // OAuth provider metrics
  oauthProviderCalls: Counter;
  oauthProviderLatency: Histogram;
  oauthProviderErrors: Counter;
  
  // Cache metrics
  cacheHits: Counter;
  cacheMisses: Counter;
  
  // Circuit breaker metrics
  circuitBreakerOpen: Counter;
  circuitBreakerHalfOpen: Counter;
  circuitBreakerClose: Counter;
}
```

##### Infrastructure Metrics
```typescript
interface InfrastructureMetrics {
  // Lambda/ECS metrics
  concurrentExecutions: Gauge;
  cpuUtilization: Gauge;
  memoryUtilization: Gauge;
  
  // Database metrics
  dbConnectionsActive: Gauge;
  dbConnectionsIdle: Gauge;
  dbQueryLatency: Histogram;
  dbErrors: Counter;
  
  // Rate limiting metrics
  rateLimitExceeded: Counter;
}
```

#### Metric Storage
- **Primary**: CloudWatch Metrics
- **Retention**: 15 months (standard)
- **Resolution**: 1 minute (standard), 1 second (high-resolution for critical metrics)

---

### 4.2 Log Aggregation

#### Purpose
集中ログ管理と検索

#### Log Streams
```yaml
Log Streams:
  - /aws/lambda/auth-service
  - /aws/ecs/auth-service
  - /aws/rds/aurora/auth-db
  - /aws/apigateway/auth-api
```

#### Log Format
```json
{
  "timestamp": "2026-02-01T00:00:00.000Z",
  "level": "INFO",
  "service": "auth-service",
  "correlationId": "abc-123-def-456",
  "userId": "user-uuid",
  "action": "authentication",
  "provider": "google",
  "duration": 850,
  "status": "success",
  "metadata": {
    "ip": "1.2.3.4",
    "userAgent": "Mozilla/5.0..."
  }
}
```

#### Log Retention
- **Application Logs**: 90 days (CloudWatch)
- **Critical Logs**: 1 year (S3 archive)
- **Access Logs**: 30 days

#### Log Queries
CloudWatch Insights queries for common scenarios:
```
# Authentication failures by provider
fields @timestamp, provider, error
| filter action = "authentication" and status = "failure"
| stats count() by provider

# High latency requests
fields @timestamp, action, duration
| filter duration > 1000
| sort duration desc

# Error rate by endpoint
fields @timestamp, endpoint, error
| filter level = "ERROR"
| stats count() by endpoint
```

---

### 4.3 Distributed Tracing

#### Purpose
リクエストの全ライフサイクル追跡

#### Trace Components
```typescript
interface TraceSegments {
  // API Gateway
  apiGateway: {
    requestId: string;
    latency: number;
    statusCode: number;
  };
  
  // Lambda/ECS function
  applicationLogic: {
    functionName: string;
    duration: number;
    memoryUsed: number;
  };
  
  // OAuth provider calls
  oauthProvider: {
    provider: string;
    operation: string;
    latency: number;
    statusCode: number;
  };
  
  // Database queries
  database: {
    query: string;
    latency: number;
    rowsAffected: number;
  };
  
  // External service calls
  externalServices: {
    service: string;
    operation: string;
    latency: number;
  };
}
```

#### Sampling Strategy
**Dynamic Sampling** (User Answer: D)

```typescript
interface SamplingStrategy {
  // Always trace errors
  errorSampling: 100%;  // All errors traced
  
  // Sample successful requests based on rate
  successSampling: {
    production: 10%;    // 10% of successful requests
    staging: 100%;      // All requests in staging
    development: 100%;  // All requests in dev
  };
  
  // Always trace slow requests
  slowRequestSampling: 100%;  // Requests > 2 seconds
  
  // Sample based on user tier (future)
  premiumUserSampling: 100%;
  standardUserSampling: 10%;
}
```

#### Trace Visualization
- Service map showing dependencies
- Latency breakdown per segment
- Error identification and root cause
- Performance bottleneck detection

---

### 4.4 Alert Rules

#### Critical Alerts (PagerDuty)
```yaml
CriticalAlerts:
  - ServiceDown:
      Condition: Health check failures > 2 consecutive
      Threshold: 2 minutes
      Action: Page on-call engineer
      
  - ErrorRateSpike:
      Condition: Error rate > 5%
      Duration: 5 minutes
      Action: Page on-call engineer
      
  - DatabaseUnavailable:
      Condition: Aurora failover initiated
      Action: Page on-call engineer
      
  - AuthenticationFailureRate:
      Condition: Auth failure rate > 10%
      Duration: 5 minutes
      Action: Page on-call engineer
```

#### Warning Alerts (Slack/Email)
```yaml
WarningAlerts:
  - HighLatency:
      Condition: P95 > 2 seconds
      Duration: 10 minutes
      Action: Notify team channel
      
  - HighCPU:
      Condition: CPU utilization > 80%
      Duration: 15 minutes
      Action: Notify team channel
      
  - ErrorRate:
      Condition: Error rate > 1%
      Duration: 10 minutes
      Action: Notify team channel
      
  - DatabaseConnections:
      Condition: Active connections > 80% of max
      Action: Notify team channel
```

#### Info Alerts (Slack)
```yaml
InfoAlerts:
  - ScalingEvent:
      Condition: Auto-scaling triggered
      Action: Notify info channel
      
  - CertificateExpiry:
      Condition: Certificate expires in < 30 days
      Action: Notify info channel
      
  - SecretRotation:
      Condition: Scheduled rotation started
      Action: Notify info channel
```

---

### 4.5 Dashboard Requirements

#### Operations Dashboard
```yaml
Dashboard: Operations Overview
Widgets:
  - RequestRate:
      Type: Line chart
      Metrics: Requests per second
      Period: 5 minutes
      
  - ErrorRate:
      Type: Line chart
      Metrics: Error rate percentage
      Period: 5 minutes
      
  - Latency:
      Type: Line chart
      Metrics: P50, P95, P99
      Period: 5 minutes
      
  - ActiveSessions:
      Type: Number
      Metrics: Current active sessions
      
  - ConcurrentUsers:
      Type: Number
      Metrics: Current concurrent users
```

#### Performance Dashboard
```yaml
Dashboard: Performance Metrics
Widgets:
  - AuthenticationLatency:
      Type: Histogram
      Breakdown: By provider
      
  - SessionValidationLatency:
      Type: Histogram
      
  - DatabaseQueryLatency:
      Type: Histogram
      Breakdown: By query type
      
  - CacheHitRate:
      Type: Gauge
      Formula: (hits / (hits + misses)) * 100
```

#### Business Dashboard
```yaml
Dashboard: Business Metrics
Widgets:
  - DailyActiveUsers:
      Type: Line chart
      Period: 1 day
      
  - NewUserRegistrations:
      Type: Line chart
      Period: 1 day
      
  - AuthenticationsByProvider:
      Type: Pie chart
      Breakdown: Google vs GitHub
      
  - AverageSessionDuration:
      Type: Number
      Period: 1 hour
```

---

## 5. Health Check Infrastructure (Logical Component)

### 5.1 Purpose
システムとその依存サービスの健全性監視

### 5.2 Health Check Levels

#### Level 1: Basic Health Check (Liveness)
```typescript
interface BasicHealthCheck {
  endpoint: '/health';
  method: 'GET';
  
  checks: {
    // Basic application health
    applicationRunning: boolean;
  };
  
  response: {
    status: 200 | 503;
    body: {
      status: 'UP' | 'DOWN';
      timestamp: string;
    };
  };
}
```

#### Level 2: Standard Health Check (Readiness)
**User Answer: B - 標準（データベース接続確認含む）**

```typescript
interface StandardHealthCheck {
  endpoint: '/health/ready';
  method: 'GET';
  
  checks: {
    // Application health
    applicationRunning: boolean;
    
    // Database connectivity
    databaseConnected: boolean;
    databaseLatency: number;  // < 100ms is healthy
  };
  
  response: {
    status: 200 | 503;
    body: {
      status: 'UP' | 'DOWN';
      timestamp: string;
      checks: {
        application: 'UP' | 'DOWN';
        database: 'UP' | 'DOWN';
      };
      details: {
        databaseLatency: number;
      };
    };
  };
}
```

#### Implementation
```typescript
app.get('/health', (req, res) => {
  // Level 1: Basic liveness check
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/ready', async (req, res) => {
  // Level 2: Readiness check with database
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    checks: {
      application: 'UP',
      database: 'UNKNOWN'
    },
    details: {}
  };
  
  try {
    // Check database connectivity
    const start = Date.now();
    await database.ping();
    const latency = Date.now() - start;
    
    health.checks.database = latency < 100 ? 'UP' : 'DEGRADED';
    health.details.databaseLatency = latency;
    
  } catch (error) {
    health.status = 'DOWN';
    health.checks.database = 'DOWN';
    health.details.databaseError = error.message;
    
    return res.status(503).json(health);
  }
  
  // Overall health
  const allHealthy = Object.values(health.checks).every(c => c === 'UP');
  health.status = allHealthy ? 'UP' : 'DEGRADED';
  
  const statusCode = health.status === 'UP' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

## 6. Failover Testing Infrastructure (Logical Component)

### 6.1 Purpose
本番環境のフェイルオーバー能力の検証

### 6.2 Testing Strategy
**User Answer: D - AIによる擬似障害シミュレーション（ステージング）＋ 本番は Aurora 1クリック・フェイルオーバー訓練（初回）**

#### Staging Environment: AI-Powered Fault Injection

```typescript
interface FaultInjectionScenarios {
  // Database failures
  databaseLatency: {
    type: 'latency';
    target: 'database';
    config: {
      delayMs: 5000;
      probability: 0.1;  // 10% of requests
    };
  };
  
  // OAuth provider failures
  oauthProviderDown: {
    type: 'unavailability';
    target: 'oauth-provider';
    config: {
      provider: 'google' | 'github';
      duration: 300000;  // 5 minutes
    };
  };
  
  // Circuit breaker activation
  highErrorRate: {
    type: 'error-injection';
    target: 'oauth-provider';
    config: {
      errorRate: 0.6;  // 60% errors to trigger circuit breaker
      duration: 60000; // 1 minute
    };
  };
  
  // Connection pool exhaustion
  connectionPoolExhaustion: {
    type: 'resource-exhaustion';
    target: 'database';
    config: {
      holdConnections: true;
      count: 18;  // Hold 18 out of 20 connections
    };
  };
}
```

#### Production Environment: Controlled Failover Drill

```yaml
ProductionFailoverDrill:
  Frequency: Initial drill only
  Type: Aurora 1-click failover
  
  Prerequisites:
    - Staging testing complete
    - Team coordination scheduled
    - Rollback plan documented
    - Monitoring dashboard ready
  
  Steps:
    1. Pre-Drill Checklist:
       - Verify Multi-AZ configuration
       - Confirm standby instance healthy
       - Notify stakeholders
       - Prepare runbook
       
    2. Execute Failover:
       - Use AWS Console 1-click failover
       - Or: aws rds failover-db-cluster --db-cluster-identifier=auth-db
       
    3. Monitor:
       - Application reconnection time
       - Error rate during failover
       - User impact metrics
       - Recovery time
       
    4. Validate:
       - All services operational
       - No data loss
       - Performance baseline restored
       
    5. Document:
       - Actual RTO achieved
       - Issues encountered
       - Lessons learned
       - Improvement opportunities
  
  Success Criteria:
    - Failover completes in < 2 minutes
    - Application auto-reconnects
    - No manual intervention required
    - Error rate returns to baseline < 5 minutes
```

#### Continuous Validation (Staging)

```typescript
interface ContinuousValidation {
  schedule: 'Weekly';
  environment: 'Staging';
  
  automatedTests: {
    // Chaos testing library integration
    chaosMonkey: {
      enabled: true;
      scenarios: [
        'database-latency',
        'oauth-provider-failure',
        'connection-pool-exhaustion'
      ];
      schedule: 'Every Saturday 2:00 AM';
    };
    
    // Expected outcomes validation
    validation: {
      circuitBreakerActivates: true;
      gracefulDegradation: true;
      retryMechanismsWork: true;
      logsGeneratedCorrectly: true;
      alertsTriggered: true;
    };
  };
}
```

---

## Component Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (WAF)                        │
│  - Request routing                                          │
│  - Rate limiting (Layer 1 & 2)                             │
│  - Request/response validation                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              Authentication Service (Lambda/ECS)             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Rate Limiter │  │ Circuit      │  │ Token Manager   │   │
│  │ (Redis)      │  │ Breaker      │  │                 │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ User Profile │  │ Secrets      │  │ Logger          │   │
│  │ Cache        │  │ Cache        │  │ (Structured)    │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────┬────────────────┬────────────────┬─────────────────┘
          │                │                │
          ↓                ↓                ↓
┌──────────────┐  ┌─────────────────┐  ┌────────────────────┐
│   Aurora     │  │ Secrets Manager │  │ CloudWatch + X-Ray │
│  PostgreSQL  │  │                 │  │                    │
│  (Multi-AZ)  │  └─────────────────┘  └────────────────────┘
└──────────────┘
```

---

## Logical to Physical Mapping (Preview)

次のInfrastructure Design段階で、これらの論理コンポーネントを具体的なAWSサービスにマッピングします：

| Logical Component | Physical Service (AWS) |
|-------------------|------------------------|
| API Gateway | AWS API Gateway (REST API) |
| Rate Limiting Store | Upstash Redis (Serverless) |
| User Profile Cache | Node.js in-memory (node-cache) |
| Secrets Cache | Node.js in-memory (custom) |
| Async Processing Queue | Lambda Async Invocation |
| Monitoring & Metrics | CloudWatch Metrics + Dashboards |
| Log Aggregation | CloudWatch Logs + Insights |
| Distributed Tracing | AWS X-Ray |
| Database | Aurora Serverless v2 PostgreSQL |
| Secrets Management | AWS Secrets Manager |
| Load Balancer | Application Load Balancer (ALB) |
| Compute | Lambda / ECS Fargate |
| WAF | AWS WAF |

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Complete