# U2: Authentication Domain - NFR Requirements

## Overview

本ドキュメントでは、Authentication Domain（U2）の非機能要件（NFR）を定義します。これらの要件は、Functional Designで定義されたビジネスロジックを実装する際の品質属性とシステム制約を規定します。

**Unit**: U2 - Authentication Domain  
**Technology Stack**: Node.js + TypeScript + Express  
**Database**: Aurora Serverless v2 PostgreSQL  
**Deployment**: Lambda/ECS Fargate (Multi-AZ in Production)  
**Target User Base**: MVP 50-100 users → 500 users (6 months)

---

## 1. Performance Requirements

### 1.1 Response Time Requirements

#### OAuth Login Flow
- **Average Response Time**: < 1 second (end-to-end)
- **95th Percentile**: < 2 seconds
- **Components**:
  - State token generation: < 50ms
  - OAuth URL generation: < 50ms
  - Token exchange with provider: < 500ms
  - User profile creation/update: < 200ms
  - Session creation: < 100ms
  - JWT generation: < 50ms

#### Session Validation
- **Average Response Time**: < 100ms
- **95th Percentile**: < 200ms
- **Components**:
  - JWT signature verification: < 20ms
  - Database session lookup: < 50ms
  - Session validity check: < 10ms

#### Token Refresh
- **Average Response Time**: < 300ms
- **95th Percentile**: < 500ms
- **Components**:
  - Refresh token lookup: < 100ms
  - New JWT generation: < 50ms
  - Database update: < 100ms

#### User Profile Retrieval
- **Average Response Time**: < 200ms
- **95th Percentile**: < 400ms
- **Components**:
  - Database query: < 150ms
  - Response serialization: < 20ms

### 1.2 Throughput Requirements

#### Initial Capacity (MVP)
- **Concurrent Users**: 50-100 users
- **Peak Authentication Requests**: 10 requests/second
- **Sustained Load**: 5 requests/second
- **Session Validation Requests**: 100 requests/second

#### Growth Projection (6 months)
- **Concurrent Users**: 500 users
- **Peak Authentication Requests**: 50 requests/second
- **Sustained Load**: 20 requests/second
- **Session Validation Requests**: 500 requests/second

### 1.3 Database Performance

#### Query Performance Targets
- **User lookup by ID**: < 50ms
- **Session lookup by ID**: < 50ms
- **OAuth state validation**: < 30ms
- **Session list per user**: < 100ms

#### Connection Management
- **Connection Pool Size**: 5-20 connections (auto-scaling)
- **Connection Timeout**: 30 seconds
- **Idle Connection Timeout**: 5 minutes

---

## 2. Scalability Requirements

### 2.1 Horizontal Scaling Strategy

#### Application Layer
- **Scaling Method**: Metrics-based auto-scaling
- **Scaling Triggers**:
  - CPU Utilization > 70%: Scale out
  - CPU Utilization < 30%: Scale in (with cooldown)
  - Request Count > threshold: Scale out
  - Memory Utilization > 80%: Scale out

#### Scaling Boundaries
- **Minimum Instances**: 
  - Production: 2 (for high availability)
  - Staging: 1
- **Maximum Instances**:
  - Production: 10
  - Staging: 3
- **Cooldown Period**: 5 minutes

### 2.2 Database Scaling

#### Aurora Serverless v2 Configuration
- **ACU Range**: 
  - Minimum: 0.5 ACU (MVP)
  - Maximum: 16 ACU (growth capacity)
- **Auto-Scaling**: Enabled
- **Scaling Policy**: Scale based on database CPU and connection count
- **Scaling Responsiveness**: Fast (< 1 second)

#### Read Scaling Strategy
- **Initial**: Single writer instance
- **Future**: Add read replicas when read/write ratio > 3:1
- **Read Replica Lag**: < 100ms acceptable

### 2.3 Capacity Planning

#### MVP Phase (0-3 months)
- **Expected Users**: 50-100
- **Application Instances**: 2
- **Database ACU**: 0.5-2 ACU
- **Estimated Cost**: $50-100/month

#### Growth Phase (3-6 months)
- **Expected Users**: 100-500
- **Application Instances**: 2-5
- **Database ACU**: 2-8 ACU
- **Estimated Cost**: $150-300/month

---

## 3. Availability Requirements

### 3.1 Service Level Agreement (SLA)

#### Availability Target
- **Production Environment**: 99.9% uptime
- **Acceptable Downtime**: 43 minutes per month
- **Measurement Period**: Monthly
- **Exclusions**: Planned maintenance windows

#### Uptime Calculation
```
Uptime % = (Total Time - Downtime) / Total Time × 100
Downtime excludes:
- Scheduled maintenance (announced 48 hours in advance)
- Force majeure events
- Issues caused by third-party OAuth providers
```

### 3.2 Fault Tolerance

#### Multi-AZ Deployment (Production)
- **Architecture**: Active-Active across 2 Availability Zones
- **Load Balancing**: Application Load Balancer (ALB)
- **Database**: Aurora Multi-AZ with automatic failover
- **Failover Time**: < 2 minutes (database), < 30 seconds (application)

#### Health Checks
- **Application Health Check**:
  - Endpoint: `/health`
  - Interval: 30 seconds
  - Timeout: 5 seconds
  - Unhealthy Threshold: 2 consecutive failures
  - Healthy Threshold: 2 consecutive successes

- **Database Health Check**:
  - Built-in Aurora monitoring
  - Automatic failover on primary failure
  - Connection retry logic in application

#### Graceful Degradation
- **OAuth Provider Unavailable**: 
  - Return clear error message
  - Allow retry
  - Do not cache failures
- **Database Connection Issues**:
  - Retry with exponential backoff (3 attempts)
  - Return 503 Service Unavailable after retries
- **Session Validation Failure**:
  - Return 401 Unauthorized
  - Client should attempt token refresh

### 3.3 Maintenance Windows

#### Scheduled Maintenance
- **Frequency**: Monthly (as needed)
- **Duration**: Max 2 hours
- **Timing**: Weekends 2:00 AM - 4:00 AM JST (lowest traffic)
- **Notification**: 48 hours advance notice
- **Zero-Downtime Deployments**: Blue-Green deployment strategy

---

## 4. Security Requirements (Infrastructure)

### 4.1 Network Security

#### VPC Configuration
- **Network Isolation**: 
  - Application in private subnets
  - Database in isolated subnets (no internet access)
  - NAT Gateway for outbound traffic
- **Security Groups**:
  - ALB: Allow 443 (HTTPS) from internet
  - Application: Allow traffic only from ALB
  - Database: Allow traffic only from application security group

#### API Gateway Security
- **AWS WAF Integration**: Enabled
- **WAF Rules**:
  - Rate limiting per IP: 100 requests/5 minutes
  - SQL injection protection
  - XSS protection
  - Known bad inputs blocking
- **DDoS Protection**: AWS Shield Standard (enabled by default)

### 4.2 Secrets Management

#### AWS Secrets Manager
- **Secrets Stored**:
  - Google OAuth Client ID & Secret
  - GitHub OAuth Client ID & Secret
  - JWT Signing Secret
  - Database credentials
- **Automatic Rotation**: 
  - JWT Secret: Every 90 days
  - Database credentials: Every 60 days (Aurora managed)
  - OAuth secrets: Manual rotation (as needed)
- **Access Control**: IAM roles with least privilege

### 4.3 Certificate Management

#### TLS/SSL Certificates
- **Certificate Authority**: AWS Certificate Manager (ACM)
- **Certificate Type**: RSA 2048-bit or ECC 256-bit
- **Auto-Renewal**: Enabled (ACM managed)
- **Protocols**: TLS 1.2 and TLS 1.3 only
- **Cipher Suites**: Strong ciphers only (no weak ciphers)

### 4.4 Data Protection

#### Data at Rest
- **Database Encryption**: AES-256 (Aurora managed encryption)
- **Encryption Key**: AWS KMS Customer Managed Key
- **Backup Encryption**: Enabled

#### Data in Transit
- **HTTPS Only**: All API endpoints require HTTPS
- **Database Connections**: SSL/TLS enforced
- **Internal Communication**: TLS for service-to-service communication

### 4.5 Compliance

#### GDPR Compliance
- **Data Residency**: Tokyo region (ap-northeast-1)
- **Right to Erasure**: User deletion API implemented
- **Data Minimization**: Only essential OAuth data stored
- **Consent Management**: OAuth consent screen

#### Audit Logging
- **Authentication Events**: All login, logout, token refresh logged
- **Security Events**: Failed authentications, suspicious activities
- **Log Retention**: 90 days (CloudWatch Logs)
- **Log Analysis**: CloudWatch Insights for security monitoring

---

## 5. Reliability Requirements

### 5.1 Error Handling and Recovery

#### Retry Policies

##### OAuth Provider Communication
- **Strategy**: Exponential backoff with jitter
- **Max Attempts**: 3
- **Initial Delay**: 100ms
- **Max Delay**: 2 seconds
- **Error Types to Retry**:
  - Network timeouts
  - 5xx server errors
  - Rate limit errors (429)

##### Database Operations
- **Strategy**: Exponential backoff
- **Max Attempts**: 3
- **Initial Delay**: 50ms
- **Max Delay**: 500ms
- **Error Types to Retry**:
  - Connection timeouts
  - Deadlocks
  - Temporary unavailability

#### Circuit Breaker Pattern
- **OAuth Provider Calls**:
  - Failure Threshold: 5 failures in 10 seconds
  - Open State Duration: 30 seconds
  - Half-Open State: 1 test request
  - Success Threshold to Close: 2 consecutive successes

#### Error Budget
- **Target Error Rate**: < 1%
- **Measurement**: Errors / Total Requests
- **Actions on Budget Exhaustion**:
  - Halt new feature deployments
  - Focus on reliability improvements
  - Root cause analysis of failures

### 5.2 Monitoring and Alerting

#### Key Performance Indicators (KPIs)

##### Availability Metrics
- **Uptime %**: Target 99.9%
- **Response Time**: P50, P95, P99
- **Error Rate**: % of 5xx responses
- **Request Success Rate**: % of successful authentications

##### Performance Metrics
- **Authentication Latency**: OAuth flow duration
- **Session Validation Latency**: JWT validation time
- **Token Refresh Latency**: Refresh token processing time
- **Database Query Performance**: Query execution time

##### Capacity Metrics
- **Active Sessions**: Current session count
- **Concurrent Users**: Active user count
- **Request Rate**: Requests per second
- **Database Connections**: Active connection count

#### Monitoring Tools

##### CloudWatch Metrics
- **Application Metrics**:
  - Request count, latency, error rate
  - Custom metrics: Authentication success/failure
- **Database Metrics**:
  - CPU utilization, connections, query performance
  - Aurora Serverless ACU usage
- **Infrastructure Metrics**:
  - ECS/Lambda metrics (CPU, memory, network)

##### AWS X-Ray
- **Distributed Tracing**: End-to-end request tracing
- **Service Map**: Visualize service dependencies
- **Trace Analysis**: Identify bottlenecks and errors

#### Alert Thresholds

##### Critical Alerts (PagerDuty)
- **Service Down**: Health check failure > 2 minutes
- **Error Rate Spike**: Error rate > 5% for 5 minutes
- **Database Unavailable**: Aurora failover initiated
- **Authentication Failure Rate**: > 10% for 5 minutes

##### Warning Alerts (Slack/Email)
- **High Latency**: P95 > 2 seconds for 10 minutes
- **High CPU**: CPU utilization > 80% for 15 minutes
- **Error Rate**: Error rate > 1% for 10 minutes
- **Database Connections**: > 80% of max connections

##### Info Alerts (Slack)
- **Scaling Event**: Auto-scaling triggered
- **Certificate Expiry**: < 30 days until expiration
- **Secret Rotation**: Scheduled rotation started

### 5.3 Incident Response

#### Incident Severity Levels
- **P1 (Critical)**: Service completely unavailable
  - Response Time: 15 minutes
  - Resolution Target: 1 hour
- **P2 (High)**: Significant degradation
  - Response Time: 30 minutes
  - Resolution Target: 4 hours
- **P3 (Medium)**: Minor issues
  - Response Time: 2 hours
  - Resolution Target: 24 hours
- **P4 (Low)**: Cosmetic issues
  - Response Time: 1 business day
  - Resolution Target: 1 week

---

## 6. Disaster Recovery (DR) Strategy

### 6.1 Backup Strategy

#### Database Backups
- **Automated Backups**: Daily snapshots
- **Backup Retention**: 7 days
- **Backup Window**: 3:00 AM - 4:00 AM JST
- **Snapshot Frequency**: Every 24 hours
- **Point-in-Time Recovery**: 5-minute granularity

#### Configuration Backups
- **Infrastructure as Code**: Terraform/CloudFormation in Git
- **Application Configuration**: Environment variables in Secrets Manager
- **Database Schema**: Version controlled migrations

### 6.2 Recovery Objectives

#### Standard DR (Production)
- **Recovery Point Objective (RPO)**: 1 hour
  - Maximum acceptable data loss
  - Achieved through continuous replication and hourly backups
- **Recovery Time Objective (RTO)**: 1 hour
  - Maximum acceptable downtime
  - Automated failover + manual verification

### 6.3 Disaster Scenarios

#### Database Failure
- **Primary Instance Failure**: 
  - Aurora automatic failover to standby (< 2 minutes)
  - Application reconnects automatically
- **Complete AZ Failure**:
  - Traffic routes to other AZ (< 1 minute)
  - Database fails over to standby in other AZ (< 2 minutes)
- **Region Failure** (Manual Recovery):
  - Restore from snapshot to different region (30-60 minutes)
  - Update DNS to point to new region
  - Estimated RTO: 1-2 hours

#### Application Failure
- **Single Instance Failure**: 
  - Load balancer removes failed instance (30 seconds)
  - Auto-scaling launches replacement (2-3 minutes)
- **Complete Deployment Failure**:
  - Rollback to previous version (5-10 minutes)
  - Blue-green deployment enables instant rollback

---

## 7. Maintainability Requirements

### 7.1 Code Quality Standards

#### Testing Requirements
- **Unit Test Coverage**: 80% minimum
- **Critical Path Coverage**: 100% (authentication flows)
- **Integration Test Coverage**: Major workflows tested
- **Test Execution**: All tests pass before deployment

#### Code Review Process
- **Peer Review**: All code changes reviewed by at least 1 developer
- **Automated Checks**: 
  - Linting (ESLint)
  - Type checking (TypeScript)
  - Security scanning (npm audit)
- **Review Criteria**:
  - Code follows TypeScript best practices
  - Tests are comprehensive and meaningful
  - Documentation is updated
  - Security considerations addressed

#### Documentation Standards
- **API Documentation**: OpenAPI/Swagger specification
- **Code Documentation**: JSDoc comments for public APIs
- **Architecture Documentation**: Diagrams and design decisions
- **Runbook**: Operational procedures for common tasks

### 7.2 Operational Requirements

#### Logging Standards

##### Log Levels
- **ERROR**: Unrecoverable errors, failures
- **WARN**: Recoverable errors, degraded functionality
- **INFO**: Significant events (authentication, logout)
- **DEBUG**: Detailed troubleshooting information

##### Log Format (Structured JSON)
```json
{
  "timestamp": "2026-02-01T00:00:00.000Z",
  "level": "INFO",
  "service": "auth-service",
  "traceId": "abc-123",
  "userId": "user-456",
  "action": "authentication",
  "provider": "google",
  "duration": 850,
  "status": "success"
}
```

##### Log Retention
- **CloudWatch Logs**: 90 days
- **Critical Logs**: Archived to S3 (1 year retention)

#### Debugging Capabilities
- **X-Ray Tracing**: Request-level tracing enabled
- **Correlation IDs**: Unique request ID throughout request lifecycle
- **Error Context**: Stack traces, request details in error logs
- **Production Debugging**: 
  - Log level adjustable via environment variable
  - No personal data in logs (GDPR compliance)

### 7.3 Deployment Procedures

#### Deployment Strategy
- **Method**: Blue-Green Deployment
- **Process**:
  1. Deploy new version to green environment
  2. Run smoke tests on green
  3. Switch traffic to green
  4. Monitor for errors
  5. Keep blue as rollback target (15 minutes)
  6. Terminate blue if successful

#### Rollback Procedures
- **Automatic Rollback**: 
  - Triggered by error rate > 5%
  - Triggered by failed health checks
- **Manual Rollback**: 
  - Switch traffic back to blue environment (< 1 minute)
  - Investigate issues in green environment

#### Deployment Frequency
- **Production**: Weekly (or as needed for critical fixes)
- **Staging**: Daily (continuous deployment)
- **Maintenance Window**: Not required for code deployments

---

## 8. Rate Limiting Strategy

### 8.1 Multi-Layer Rate Limiting

#### Layer 1: AWS WAF (Global)
- **Rate Limit**: 100 requests per 5 minutes per IP
- **Scope**: All endpoints
- **Action**: Block and return 429 Too Many Requests
- **Purpose**: Prevent DDoS attacks

#### Layer 2: API Gateway (API-Level)
- **Rate Limit**: 50 requests per second per API key (future)
- **Burst Limit**: 100 requests
- **Scope**: All API endpoints
- **Action**: Throttle and return 429
- **Purpose**: Prevent API abuse

#### Layer 3: Application (Endpoint-Specific)

##### Authentication Endpoints
- **Login Rate Limit**: 5 login attempts per 15 minutes per IP
- **Callback Rate Limit**: 10 callbacks per 15 minutes per IP
- **Purpose**: Prevent brute force attacks

##### Token Refresh Endpoint
- **Rate Limit**: 20 refresh requests per hour per user
- **Purpose**: Prevent token abuse

##### Profile Endpoints
- **Rate Limit**: 100 requests per minute per user
- **Purpose**: Prevent excessive API usage

---

## NFR Summary Matrix

| Category | Requirement | Target | Measurement |
|----------|-------------|--------|-------------|
| **Performance** | OAuth Login Response Time | < 1s avg, < 2s P95 | CloudWatch Metrics |
| **Performance** | Session Validation | < 100ms avg | X-Ray Tracing |
| **Scalability** | Concurrent Users | 50-100 (MVP) → 500 (6mo) | Active Sessions |
| **Scalability** | Auto-Scaling | Metrics-based | ECS/Lambda Metrics |
| **Availability** | Uptime SLA | 99.9% | CloudWatch Alarms |
| **Availability** | Multi-AZ | Production only | Infrastructure Config |
| **Security** | Secrets Management | AWS Secrets Manager | Audit Logs |
| **Security** | Rate Limiting | WAF + Gateway + App | WAF Logs |
| **Reliability** | Error Rate | < 1% | CloudWatch Metrics |
| **Reliability** | Retry Policy | Exponential backoff | Application Logs |
| **DR** | RPO | 1 hour | Backup Verification |
| **DR** | RTO | 1 hour | Failover Testing |
| **Maintainability** | Test Coverage | 80% | Code Coverage Report |
| **Monitoring** | Observability | CloudWatch + X-Ray | Trace Sampling |

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Complete