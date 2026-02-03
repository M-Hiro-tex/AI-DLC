# Secrets Management Guide - Portfolio System

**Version**: 1.0  
**Last Updated**: 2026-02-03

---

## 📋 Overview

This guide covers comprehensive secrets management for the Portfolio System using AWS Secrets Manager. Proper secrets management is critical for security and operational integrity.

---

## 🔐 Secrets Architecture

```
AWS Secrets Manager
├── /portfolio/dev/
│   ├── jwt-secret
│   ├── oauth/github
│   └── oauth/google
├── /portfolio/staging/
│   ├── jwt-secret
│   ├── oauth/github
│   └── oauth/google
└── /portfolio/prod/
    ├── jwt-secret
    ├── oauth/github
    └── oauth/google
```

---

## 🎯 Secret Types

### 1. JWT Secrets

**Purpose**: Sign and verify JSON Web Tokens for session management

**Requirements**:
- Minimum 256-bit random key
- Different key per environment
- Rotation every 90 days (production)

**Creation**:
```bash
# Generate secure random key
SECRET_KEY=$(openssl rand -base64 32)

# Create secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name /portfolio/${ENVIRONMENT}/jwt-secret \
  --description "JWT signing key for ${ENVIRONMENT}" \
  --secret-string "${SECRET_KEY}" \
  --tags Key=Environment,Value=${ENVIRONMENT} Key=Service,Value=Authentication
```

### 2. OAuth Provider Credentials

**Purpose**: Authenticate with OAuth providers (GitHub, Google)

**Requirements**:
- Separate OAuth apps per environment
- Callback URLs must match environment
- Store both clientId and clientSecret

**GitHub OAuth Setup**:
```bash
# Create GitHub OAuth secret
aws secretsmanager create-secret \
  --name /portfolio/${ENVIRONMENT}/oauth/github \
  --description "GitHub OAuth credentials for ${ENVIRONMENT}" \
  --secret-string '{
    "clientId": "your-github-client-id",
    "clientSecret": "your-github-client-secret"
  }' \
  --tags Key=Environment,Value=${ENVIRONMENT} Key=Provider,Value=GitHub
```

**Google OAuth Setup**:
```bash
# Create Google OAuth secret
aws secretsmanager create-secret \
  --name /portfolio/${ENVIRONMENT}/oauth/google \
  --description "Google OAuth credentials for ${ENVIRONMENT}" \
  --secret-string '{
    "clientId": "your-google-client-id",
    "clientSecret": "your-google-client-secret"
  }' \
  --tags Key=Environment,Value=${ENVIRONMENT} Key=Provider,Value=Google
```

---

## 🔄 Secrets Rotation

### JWT Secret Rotation

**Recommended Schedule**:
- Development: Annual
- Staging: Quarterly
- Production: Every 90 days

**Rotation Process**:
```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Update secret in Secrets Manager
aws secretsmanager update-secret \
  --secret-id /portfolio/prod/jwt-secret \
  --secret-string "${NEW_SECRET}"

# 3. Deploy updated Lambda functions (they will pick up new secret)
cd u2-authentication/infrastructure
cdk deploy --context environment=production

# 4. Monitor for errors in next 24 hours
aws logs tail /aws/lambda/Portfolio-Authentication-Prod --follow

# 5. After verification, invalidate old sessions (optional)
# Users will need to re-authenticate
```

### OAuth Credentials Rotation

**When to Rotate**:
- Suspected compromise
- Team member departure
- Annual security review
- Provider recommendation

**Rotation Process**:
```bash
# 1. Create new OAuth app in provider dashboard
#    (GitHub Settings > Developer Settings > OAuth Apps)

# 2. Update secret with new credentials
aws secretsmanager update-secret \
  --secret-id /portfolio/prod/oauth/github \
  --secret-string '{
    "clientId": "new-client-id",
    "clientSecret": "new-client-secret"
  }'

# 3. Deploy updated services
cd u2-authentication/infrastructure
cdk deploy --context environment=production

# 4. Test OAuth flow
curl -X GET https://your-api.com/auth/oauth/github/authorize

# 5. After verification, delete old OAuth app
```

---

## 🔍 Retrieving Secrets

### From AWS CLI

```bash
# Get secret value
aws secretsmanager get-secret-value \
  --secret-id /portfolio/prod/jwt-secret \
  --query SecretString \
  --output text

# Get OAuth credentials
aws secretsmanager get-secret-value \
  --secret-id /portfolio/prod/oauth/github \
  --query SecretString \
  --output text | jq '.'
```

### From Lambda Function (Node.js)

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretId: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await client.send(command);
  return response.SecretString || '';
}

// Usage
const jwtSecret = await getSecret('/portfolio/prod/jwt-secret');
const oauthCreds = JSON.parse(await getSecret('/portfolio/prod/oauth/github'));
```

### Caching Considerations

**Lambda Function Secret Caching**:
```typescript
// Cache secrets for Lambda container reuse
let cachedJwtSecret: string | null = null;

async function getJwtSecret(): Promise<string> {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }
  
  cachedJwtSecret = await getSecret('/portfolio/prod/jwt-secret');
  return cachedJwtSecret;
}

// Refresh cache periodically (e.g., every hour)
setInterval(() => {
  cachedJwtSecret = null;
}, 60 * 60 * 1000);
```

---

## 🛡️ Security Best Practices

### 1. Access Control

**IAM Policy for Lambda Functions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:REGION:ACCOUNT:secret:/portfolio/prod/*"
      ]
    }
  ]
}
```

**Principle of Least Privilege**:
- Lambda functions only access secrets they need
- Development resources cannot access production secrets
- Use separate AWS accounts for environments

### 2. Audit and Monitoring

**Enable CloudTrail Logging**:
```bash
# CloudTrail automatically logs Secrets Manager API calls
# Review access patterns regularly

# Query recent secret accesses
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --max-items 100
```

**Set Up Alarms**:
```bash
# Create CloudWatch alarm for unauthorized access attempts
aws cloudwatch put-metric-alarm \
  --alarm-name secrets-manager-unauthorized-access \
  --alarm-description "Alert on unauthorized Secrets Manager access" \
  --metric-name UnauthorizedApiCalls \
  --namespace AWS/SecretsManager \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold
```

### 3. Encryption

**Encryption at Rest**:
- Secrets Manager uses AWS KMS by default
- Use customer-managed KMS key for production (optional)

**Custom KMS Key Setup**:
```bash
# Create custom KMS key
KEY_ID=$(aws kms create-key \
  --description "Portfolio secrets encryption key" \
  --query 'KeyMetadata.KeyId' \
  --output text)

# Create secret with custom KMS key
aws secretsmanager create-secret \
  --name /portfolio/prod/jwt-secret \
  --secret-string "${SECRET_KEY}" \
  --kms-key-id ${KEY_ID}
```

---

## 🚨 Incident Response

### Suspected Secret Compromise

**Immediate Actions**:
1. **Rotate the secret immediately**
2. **Deploy updated services**
3. **Invalidate all active sessions** (if JWT secret)
4. **Review CloudTrail logs** for unauthorized access
5. **Notify security team**
6. **Document incident**

**Investigation Checklist**:
- [ ] Review CloudTrail logs for secret access
- [ ] Check Lambda function logs for anomalies
- [ ] Verify IAM policies are correct
- [ ] Review recent deployments
- [ ] Check for unauthorized IAM users/roles
- [ ] Scan for exposed credentials in code repositories

### Lost Access to Secrets

**Recovery Process**:
```bash
# 1. Verify IAM permissions
aws iam get-user
aws iam list-attached-user-policies --user-name YOUR_USER

# 2. Check secret exists
aws secretsmanager describe-secret \
  --secret-id /portfolio/prod/jwt-secret

# 3. If secret deleted, check recovery window
aws secretsmanager list-secrets \
  --filters Key=name,Values=/portfolio/prod/jwt-secret \
  --include-planned-deletion

# 4. Restore if within recovery window
aws secretsmanager restore-secret \
  --secret-id /portfolio/prod/jwt-secret
```

---

## 📋 Secret Lifecycle Management

### Development Environment

**Creation**:
```bash
./scripts/setup-dev-secrets.sh
```

**Rotation**: Annual or as needed

**Deletion**: When environment is decommissioned

### Staging Environment

**Creation**: Before first staging deployment

**Rotation**: Quarterly

**Testing**: Test rotation process in staging before production

### Production Environment

**Creation**: Before production deployment

**Rotation**: Every 90 days (automated)

**Monitoring**: Continuous

**Backup**: Automatic via Secrets Manager

---

## 🔧 Automation Scripts

### Bulk Secret Creation

```bash
#!/bin/bash
# setup-secrets.sh

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: ./setup-secrets.sh <environment>"
  exit 1
fi

echo "Setting up secrets for ${ENVIRONMENT}..."

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
aws secretsmanager create-secret \
  --name /portfolio/${ENVIRONMENT}/jwt-secret \
  --secret-string "${JWT_SECRET}" \
  --tags Key=Environment,Value=${ENVIRONMENT}

# GitHub OAuth (placeholder - replace with actual values)
aws secretsmanager create-secret \
  --name /portfolio/${ENVIRONMENT}/oauth/github \
  --secret-string '{
    "clientId": "REPLACE_WITH_GITHUB_CLIENT_ID",
    "clientSecret": "REPLACE_WITH_GITHUB_CLIENT_SECRET"
  }' \
  --tags Key=Environment,Value=${ENVIRONMENT} Key=Provider,Value=GitHub

# Google OAuth (placeholder - replace with actual values)
aws secretsmanager create-secret \
  --name /portfolio/${ENVIRONMENT}/oauth/google \
  --secret-string '{
    "clientId": "REPLACE_WITH_GOOGLE_CLIENT_ID",
    "clientSecret": "REPLACE_WITH_GOOGLE_CLIENT_SECRET"
  }' \
  --tags Key=Environment,Value=${ENVIRONMENT} Key=Provider,Value=Google

echo "Secrets created. Please update OAuth credentials manually."
```

### Rotation Reminder Script

```bash
#!/bin/bash
# check-secret-age.sh

SECRET_ID=$1
MAX_AGE_DAYS=90

LAST_CHANGED=$(aws secretsmanager describe-secret \
  --secret-id ${SECRET_ID} \
  --query 'LastChangedDate' \
  --output text)

DAYS_OLD=$(( ($(date +%s) - $(date -d ${LAST_CHANGED} +%s)) / 86400 ))

if [ ${DAYS_OLD} -gt ${MAX_AGE_DAYS} ]; then
  echo "WARNING: Secret ${SECRET_ID} is ${DAYS_OLD} days old (max: ${MAX_AGE_DAYS})"
  exit 1
else
  echo "OK: Secret ${SECRET_ID} is ${DAYS_OLD} days old"
  exit 0
fi
```

---

## 📚 OAuth Provider Setup

### GitHub OAuth Application

1. **Navigate to**: GitHub Settings > Developer Settings > OAuth Apps
2. **Click**: "New OAuth App"
3. **Fill in**:
   - Application name: `Portfolio System (Production)`
   - Homepage URL: `https://yourdomain.com`
   - Authorization callback URL: `https://yourdomain.com/auth/oauth/github/callback`
4. **Generate**: Client Secret
5. **Store**: Client ID and Client Secret in Secrets Manager

### Google OAuth Application

1. **Navigate to**: Google Cloud Console > APIs & Services > Credentials
2. **Click**: "Create Credentials" > "OAuth client ID"
3. **Select**: Web application
4. **Fill in**:
   - Name: `Portfolio System (Production)`
   - Authorized redirect URIs: `https://yourdomain.com/auth/oauth/google/callback`
5. **Download**: OAuth 2.0 Client ID credentials
6. **Store**: Client ID and Client Secret in Secrets Manager

---

## ✅ Secrets Management Checklist

### Initial Setup
- [ ] Secrets created for all environments
- [ ] IAM policies configured correctly
- [ ] Lambda functions have access to required secrets
- [ ] OAuth apps configured in provider dashboards
- [ ] CloudTrail logging enabled
- [ ] Alarms configured for unauthorized access

### Regular Maintenance
- [ ] Review secrets age monthly
- [ ] Rotate production secrets quarterly
- [ ] Audit access logs quarterly
- [ ] Test rotation process in staging
- [ ] Update documentation with any changes
- [ ] Review IAM policies for least privilege

### Security Reviews
- [ ] Annual comprehensive security review
- [ ] Verify no secrets in code repositories
- [ ] Check for exposed secrets in logs
- [ ] Validate encryption configuration
- [ ] Review and update access policies
- [ ] Test incident response procedures

---

## 📞 Support

For secrets management issues:
- **Forgotten Secrets**: Check AWS Secrets Manager
- **Access Issues**: Verify IAM permissions
- **Rotation Problems**: Review CloudWatch logs
- **Security Incidents**: Contact security team immediately

---

## 📚 Related Documentation

- [Deployment Guide](./deployment-guide.md)
- [Environment Setup](./environment-setup.md)
- [Security Checklist](../security/security-checklist.md)
- [Incident Response](../operations/incident-response.md)