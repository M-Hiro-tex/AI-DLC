# Environment Setup Guide - Portfolio System

**Version**: 1.0  
**Last Updated**: 2026-02-03

---

## 📋 Overview

This guide provides detailed instructions for setting up different environments (Development, Staging, Production) for the Portfolio System.

---

## 🌍 Environment Overview

### Environment Characteristics

| Aspect | Development | Staging | Production |
|--------|-------------|---------|------------|
| **Purpose** | Local dev & testing | Pre-prod validation | Live system |
| **AWS Account** | Dev account | Staging account | Production account |
| **Region** | us-east-1 | us-east-1 | us-east-1 (primary) |
| **Cost** | Low | Medium | Varies |
| **Data** | Test/mock data | Production-like | Real data |
| **Monitoring** | Basic | Standard | Comprehensive |
| **Alarms** | Minimal | Important only | All critical |

---

## 🔧 Development Environment

### Purpose
- Local development and unit testing
- Feature development and debugging
- Integration testing

### Configuration

#### Environment Variables - U2-Authentication

Create `.env` file in `u2-authentication/`:

```bash
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DYNAMODB_ENDPOINT=http://localhost:8000  # For local DynamoDB
TABLE_PREFIX=Portfolio-Dev

# Authentication
JWT_SECRET_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/dev/jwt-secret
SESSION_DURATION=7200  # 2 hours
COOKIE_DOMAIN=localhost

# OAuth
GITHUB_CLIENT_ID_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/dev/oauth/github
GOOGLE_CLIENT_ID_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/dev/oauth/google
OAUTH_CALLBACK_BASE_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=100
```

#### Environment Variables - U3-Project

Create `.env` file in `u3-project/`:

```bash
# Application
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Database
DYNAMODB_ENDPOINT=http://localhost:8000  # For local DynamoDB
TABLE_PREFIX=Portfolio-Dev

# Authentication Service
AUTH_SERVICE_URL=http://localhost:3000
JWT_SECRET_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/dev/jwt-secret

# Storage
MAX_PROJECT_SIZE_MB=100
MAX_TEMPLATE_SIZE_MB=50
```

### AWS Resources

#### DynamoDB Tables
- `Portfolio-Users-Dev`
- `Portfolio-Sessions-Dev`
- `Portfolio-Projects-Dev`
- `Portfolio-Templates-Dev`

#### Lambda Functions
- `Portfolio-Authentication-Dev`
- `Portfolio-Project-Dev`

#### API Gateways
- `Portfolio-Auth-API-Dev`
- `Portfolio-Project-API-Dev`

### Local Development Setup

```bash
# Install DynamoDB Local (optional for offline development)
docker run -p 8000:8000 amazon/dynamodb-local

# Or use AWS SAM Local
sam local start-api --port 3000
```

---

## 🧪 Staging Environment

### Purpose
- Pre-production testing
- User acceptance testing (UAT)
- Performance testing
- Integration with production-like data

### Configuration

#### Environment Variables - U2-Authentication

```bash
# Application
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info

# Database
TABLE_PREFIX=Portfolio-Staging

# Authentication
JWT_SECRET_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/staging/jwt-secret
SESSION_DURATION=3600  # 1 hour
COOKIE_DOMAIN=staging.yourdomain.com

# OAuth
GITHUB_CLIENT_ID_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/staging/oauth/github
GOOGLE_CLIENT_ID_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/staging/oauth/google
OAUTH_CALLBACK_BASE_URL=https://staging.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=50
```

#### Environment Variables - U3-Project

```bash
# Application
NODE_ENV=staging
PORT=3001
LOG_LEVEL=info

# Database
TABLE_PREFIX=Portfolio-Staging

# Authentication Service
AUTH_SERVICE_URL=https://auth-staging.yourdomain.com
JWT_SECRET_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/staging/jwt-secret

# Storage
MAX_PROJECT_SIZE_MB=100
MAX_TEMPLATE_SIZE_MB=50
```

### AWS Resources

#### DynamoDB Tables
- `Portfolio-Users-Staging`
- `Portfolio-Sessions-Staging`
- `Portfolio-Projects-Staging`
- `Portfolio-Templates-Staging`

#### Lambda Functions
- `Portfolio-Authentication-Staging`
- `Portfolio-Project-Staging`

#### API Gateways
- `Portfolio-Auth-API-Staging`
- `Portfolio-Project-API-Staging`

### Staging-Specific Setup

```bash
# Deploy to staging
cd u2-authentication/infrastructure
cdk deploy --context environment=staging

cd ../../u3-project/infrastructure
cdk deploy --context environment=staging

# Seed staging data
cd ../
npm run seed:templates -- --environment staging
```

---

## 🚀 Production Environment

### Purpose
- Live production system
- Real user traffic
- Business-critical operations

### Configuration

#### Environment Variables - U2-Authentication

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Database
TABLE_PREFIX=Portfolio-Prod

# Authentication
JWT_SECRET_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/prod/jwt-secret
SESSION_DURATION=1800  # 30 minutes
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# OAuth
GITHUB_CLIENT_ID_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/prod/oauth/github
GOOGLE_CLIENT_ID_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/prod/oauth/google
OAUTH_CALLBACK_BASE_URL=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=20

# Monitoring
ENABLE_XRAY=true
ENABLE_DETAILED_METRICS=true
```

#### Environment Variables - U3-Project

```bash
# Application
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn

# Database
TABLE_PREFIX=Portfolio-Prod

# Authentication Service
AUTH_SERVICE_URL=https://auth.yourdomain.com
JWT_SECRET_ARN=arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/prod/jwt-secret

# Storage
MAX_PROJECT_SIZE_MB=100
MAX_TEMPLATE_SIZE_MB=50

# Monitoring
ENABLE_XRAY=true
ENABLE_DETAILED_METRICS=true
```

### AWS Resources

#### DynamoDB Tables
- `Portfolio-Users-Prod`
- `Portfolio-Sessions-Prod`
- `Portfolio-Projects-Prod`
- `Portfolio-Templates-Prod`

**Production Table Settings**:
- Point-in-time recovery: Enabled
- Backup retention: 35 days
- Read/Write capacity: On-demand

#### Lambda Functions
- `Portfolio-Authentication-Prod`
- `Portfolio-Project-Prod`

**Production Lambda Settings**:
- Reserved concurrency: 100
- Memory: 1024 MB
- Timeout: 30 seconds
- X-Ray tracing: Enabled

#### API Gateways
- `Portfolio-Auth-API-Prod`
- `Portfolio-Project-API-Prod`

**Production API Settings**:
- Throttling: 10,000 requests/second
- Burst: 5,000 requests
- CloudWatch logs: Full request/response logging

### Production Deployment Process

```bash
# 1. Pre-deployment checklist
- [ ] Code reviewed and approved
- [ ] Tests passing in staging
- [ ] Security scan completed
- [ ] Performance validated
- [ ] Rollback plan prepared

# 2. Deploy to production
cd u2-authentication/infrastructure
cdk deploy --context environment=production --require-approval always

cd ../../u3-project/infrastructure
cdk deploy --context environment=production --require-approval always

# 3. Post-deployment validation
- [ ] Health checks passing
- [ ] Smoke tests successful
- [ ] Monitoring dashboards updated
- [ ] No error spikes in logs
```

---

## 🔐 Secrets Management by Environment

### Development Secrets

```bash
# JWT Secret (256-bit key)
aws secretsmanager create-secret \
  --name /portfolio/dev/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"

# GitHub OAuth
aws secretsmanager create-secret \
  --name /portfolio/dev/oauth/github \
  --secret-string '{
    "clientId": "dev-github-client-id",
    "clientSecret": "dev-github-client-secret"
  }'

# Google OAuth
aws secretsmanager create-secret \
  --name /portfolio/dev/oauth/google \
  --secret-string '{
    "clientId": "dev-google-client-id",
    "clientSecret": "dev-google-client-secret"
  }'
```

### Staging Secrets

```bash
# JWT Secret (256-bit key)
aws secretsmanager create-secret \
  --name /portfolio/staging/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"

# GitHub OAuth (Staging app)
aws secretsmanager create-secret \
  --name /portfolio/staging/oauth/github \
  --secret-string '{
    "clientId": "staging-github-client-id",
    "clientSecret": "staging-github-client-secret"
  }'

# Google OAuth (Staging app)
aws secretsmanager create-secret \
  --name /portfolio/staging/oauth/google \
  --secret-string '{
    "clientId": "staging-google-client-id",
    "clientSecret": "staging-google-client-secret"
  }'
```

### Production Secrets

```bash
# JWT Secret (256-bit key) - Use strong, randomly generated key
aws secretsmanager create-secret \
  --name /portfolio/prod/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"

# GitHub OAuth (Production app)
aws secretsmanager create-secret \
  --name /portfolio/prod/oauth/github \
  --secret-string '{
    "clientId": "prod-github-client-id",
    "clientSecret": "prod-github-client-secret"
  }'

# Google OAuth (Production app)
aws secretsmanager create-secret \
  --name /portfolio/prod/oauth/google \
  --secret-string '{
    "clientId": "prod-google-client-id",
    "clientSecret": "prod-google-client-secret"
  }'
```

---

## 📊 Resource Sizing by Environment

### DynamoDB Capacity

| Table | Development | Staging | Production |
|-------|-------------|---------|------------|
| Users | On-demand | On-demand | On-demand |
| Sessions | On-demand | On-demand | On-demand |
| Projects | On-demand | On-demand | On-demand |
| Templates | On-demand | On-demand | On-demand |

### Lambda Configuration

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| Memory | 512 MB | 1024 MB | 1024 MB |
| Timeout | 30s | 30s | 30s |
| Reserved Concurrency | None | 50 | 100 |
| X-Ray Tracing | Optional | Enabled | Enabled |

### API Gateway Limits

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| Throttle Rate | 1000 req/s | 5000 req/s | 10000 req/s |
| Burst Limit | 500 | 2500 | 5000 |
| Logging | Errors only | Info | Full |

---

## 🔄 Environment Promotion

### Development → Staging

```bash
# 1. Ensure all tests pass in development
cd u2-authentication && npm test
cd ../u3-project && npm test

# 2. Update staging configuration
# Review and update staging environment variables

# 3. Deploy to staging
./deploy-staging.sh

# 4. Run integration tests
npm run test:integration -- --env staging
```

### Staging → Production

```bash
# 1. Staging validation complete
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security reviewed
- [ ] UAT approved

# 2. Create production release
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0

# 3. Deploy to production
./deploy-production.sh

# 4. Verify production deployment
npm run test:smoke -- --env production
```

---

## 🛡️ Security Configuration by Environment

### Development
- Public endpoints allowed
- Relaxed CORS policy
- Debug logging enabled
- Test API keys used

### Staging
- Restricted IP ranges (VPN only)
- Standard CORS policy
- Info logging
- Staging API keys

### Production
- Strict IP whitelisting
- Strict CORS policy
- Warn/Error logging only
- Production API keys
- WAF enabled
- DDoS protection enabled

---

## 📚 Related Documentation

- [Deployment Guide](./deployment-guide.md)
- [Secrets Management](./secrets-management.md)
- [Monitoring Setup](../monitoring/cloudwatch-setup.md)
- [Security Checklist](../security/security-checklist.md)

---

## ✅ Environment Setup Checklist

### Development
- [ ] AWS credentials configured
- [ ] CDK bootstrapped
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Secrets created
- [ ] DynamoDB Local running (optional)
- [ ] Health checks passing

### Staging
- [ ] Staging AWS account configured
- [ ] CDK deployed to staging
- [ ] Staging secrets configured
- [ ] Integration tests passing
- [ ] Monitoring configured
- [ ] UAT environment ready

### Production
- [ ] Production AWS account configured
- [ ] Production secrets configured
- [ ] Security review completed
- [ ] Monitoring and alarms configured
- [ ] Backup strategy in place
- [ ] Disaster recovery tested
- [ ] Team trained on operations
- [ ] Runbooks prepared