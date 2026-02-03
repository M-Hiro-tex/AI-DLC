# Deployment Guide - Portfolio System

**Version**: 1.0  
**Last Updated**: 2026-02-03  
**Status**: Production Ready

---

## 📋 Overview

This guide provides comprehensive instructions for deploying the Portfolio System to AWS using AWS CDK. The system consists of two main services:

- **U2: Authentication Domain** - OAuth-based authentication service
- **U3: Project Domain** - Portfolio and project management service

---

## 🎯 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AWS Cloud                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              API Gateway (REST API)                     │ │
│  └──────────────┬──────────────────┬─────────────────────┘ │
│                 │                  │                         │
│  ┌──────────────▼─────────┐  ┌───▼──────────────────────┐  │
│  │  Lambda Function       │  │  Lambda Function         │  │
│  │  U2-Authentication     │  │  U3-Project              │  │
│  └──────────────┬─────────┘  └───┬──────────────────────┘  │
│                 │                 │                          │
│  ┌──────────────▼─────────────────▼──────────────────────┐  │
│  │            DynamoDB Tables                             │  │
│  │  - Users                                               │  │
│  │  - Sessions                                            │  │
│  │  - Projects                                            │  │
│  │  - Templates                                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CloudWatch Logs & Metrics                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Secrets Manager                                        │  │
│  │  - OAuth Credentials                                    │  │
│  │  - JWT Secrets                                          │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔐 Prerequisites

### 1. AWS Account Setup
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- IAM user/role with deployment permissions

### 2. Development Tools
```bash
# Node.js and npm
node --version  # v18.x or later
npm --version   # v9.x or later

# AWS CDK
npm install -g aws-cdk
cdk --version   # 2.x or later

# TypeScript
npm install -g typescript
tsc --version   # 5.x or later
```

### 3. AWS Credentials Configuration
```bash
# Configure AWS credentials
aws configure

# Verify configuration
aws sts get-caller-identity
```

### 4. Required Permissions

Your AWS IAM user/role needs the following permissions:
- CloudFormation (full access)
- Lambda (create, update, delete functions)
- API Gateway (create, update, delete APIs)
- DynamoDB (create, update, delete tables)
- IAM (create, update roles and policies)
- CloudWatch (create logs and metrics)
- Secrets Manager (create, update secrets)

---

## 🌍 Environment Setup

### Available Environments

1. **Development** - For local development and testing
2. **Staging** - Pre-production environment for validation
3. **Production** - Live production environment

### Environment Variables

Each environment requires specific configuration. See [environment-setup.md](./environment-setup.md) for detailed instructions.

---

## 🚀 Deployment Steps

### Step 1: Clone and Setup

```bash
# Navigate to project root
cd /path/to/aidlc-workflows

# Install dependencies for U2-Authentication
cd u2-authentication
npm install

# Install CDK dependencies
cd infrastructure
npm install

# Return to project root
cd ../..

# Install dependencies for U3-Project
cd u3-project
npm install

# Install CDK dependencies
cd infrastructure
npm install

# Return to project root
cd ../..
```

### Step 2: Configure Secrets

Before deploying, configure secrets in AWS Secrets Manager:

```bash
# Create OAuth secrets for U2-Authentication
aws secretsmanager create-secret \
  --name /portfolio/dev/oauth/github \
  --secret-string '{
    "clientId": "your-github-client-id",
    "clientSecret": "your-github-client-secret"
  }'

aws secretsmanager create-secret \
  --name /portfolio/dev/oauth/google \
  --secret-string '{
    "clientId": "your-google-client-id",
    "clientSecret": "your-google-client-secret"
  }'

# Create JWT secret
aws secretsmanager create-secret \
  --name /portfolio/dev/jwt-secret \
  --secret-string "your-secure-jwt-secret-key"
```

See [secrets-management.md](./secrets-management.md) for detailed secret configuration.

### Step 3: Bootstrap CDK (First Time Only)

```bash
# Bootstrap CDK in your AWS account (only needed once per account/region)
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### Step 4: Deploy U2-Authentication Service

```bash
# Navigate to U2 infrastructure
cd u2-authentication/infrastructure

# Build TypeScript
npm run build

# Synthesize CloudFormation template (optional - for review)
cdk synth

# Deploy to development environment
cdk deploy --context environment=development

# Note the API endpoint from deployment output
# Example: https://abc123.execute-api.us-east-1.amazonaws.com/dev/
```

### Step 5: Deploy U3-Project Service

```bash
# Navigate to U3 infrastructure
cd ../../u3-project/infrastructure

# Build TypeScript
npm run build

# Synthesize CloudFormation template (optional - for review)
cdk synth

# Deploy to development environment
cdk deploy --context environment=development

# Note the API endpoint from deployment output
# Example: https://xyz789.execute-api.us-east-1.amazonaws.com/dev/
```

### Step 6: Seed Initial Data (Optional)

```bash
# Seed template data for U3-Project
cd ..
npm run seed:templates

# Verify data seeded successfully
aws dynamodb scan --table-name Portfolio-Templates-Dev --select COUNT
```

### Step 7: Verify Deployment

```bash
# Test U2-Authentication health endpoint
curl https://YOUR-U2-API-ENDPOINT/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2026-02-03T...",
#   "service": "authentication"
# }

# Test U3-Project health endpoint
curl https://YOUR-U3-API-ENDPOINT/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2026-02-03T...",
#   "service": "project-management"
# }
```

---

## 🔄 Deployment Scripts

### Automated Deployment

Use the provided deployment scripts for streamlined deployment:

#### U2-Authentication Deployment

```bash
cd u2-authentication
chmod +x scripts/deploy.sh

# Deploy to development
./scripts/deploy.sh development

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

#### U3-Project Deployment

```bash
cd u3-project
chmod +x scripts/deploy.sh

# Deploy to development
./scripts/deploy.sh development

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

---

## 🔍 Post-Deployment Validation

### 1. Verify Resources Created

```bash
# List Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `Portfolio`)]'

# List API Gateways
aws apigateway get-rest-apis --query 'items[?name==`Portfolio-API`]'

# List DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?starts_with(@, `Portfolio`)]'
```

### 2. Check CloudWatch Logs

```bash
# View U2-Authentication logs
aws logs tail /aws/lambda/Portfolio-Authentication-Dev --follow

# View U3-Project logs
aws logs tail /aws/lambda/Portfolio-Project-Dev --follow
```

### 3. Test API Endpoints

```bash
# Test authentication flow
curl -X POST https://YOUR-U2-API-ENDPOINT/auth/oauth/github/authorize

# Test project listing (requires authentication)
curl -H "Authorization: Bearer YOUR-JWT-TOKEN" \
  https://YOUR-U3-API-ENDPOINT/projects
```

---

## 🔧 Troubleshooting

### Common Issues

#### Issue: CDK Deploy Fails with Permission Error

**Cause**: Insufficient IAM permissions

**Solution**:
```bash
# Verify your IAM permissions
aws iam get-user
aws iam list-attached-user-policies --user-name YOUR-USERNAME

# Ensure you have the required policies attached
```

#### Issue: Lambda Function Fails to Start

**Cause**: Missing environment variables or secrets

**Solution**:
```bash
# Check Lambda configuration
aws lambda get-function-configuration --function-name FUNCTION-NAME

# Verify secrets exist
aws secretsmanager list-secrets --query 'SecretList[?starts_with(Name, `/portfolio`)]'
```

#### Issue: API Gateway Returns 502

**Cause**: Lambda function error or timeout

**Solution**:
```bash
# Check CloudWatch logs for errors
aws logs tail /aws/lambda/FUNCTION-NAME --follow

# Check Lambda timeout settings
aws lambda get-function-configuration --function-name FUNCTION-NAME \
  --query 'Timeout'
```

#### Issue: DynamoDB Table Not Found

**Cause**: Table name mismatch or deployment incomplete

**Solution**:
```bash
# List all tables
aws dynamodb list-tables

# Verify table exists with correct name
aws dynamodb describe-table --table-name EXPECTED-TABLE-NAME
```

---

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] AWS credentials configured
- [ ] CDK installed and bootstrapped
- [ ] Dependencies installed
- [ ] Secrets configured in Secrets Manager
- [ ] Environment variables reviewed

### Deployment
- [ ] CDK bootstrap completed (first time)
- [ ] U2-Authentication deployed successfully
- [ ] U3-Project deployed successfully
- [ ] Initial data seeded (if applicable)

### Post-Deployment
- [ ] Health endpoints responding
- [ ] CloudWatch logs accessible
- [ ] API endpoints documented
- [ ] Monitoring dashboards configured
- [ ] Team notified of deployment

---

## 📚 Related Documentation

- [Environment Setup Guide](./environment-setup.md) - Detailed environment configuration
- [CDK Deployment Details](./cdk-deployment.md) - CDK-specific deployment information
- [Secrets Management](./secrets-management.md) - Managing secrets and credentials
- [Monitoring Setup](../monitoring/cloudwatch-setup.md) - CloudWatch configuration
- [Troubleshooting Guide](../operations/troubleshooting.md) - Common issues and solutions

---

## 🔄 Updates and Rollbacks

### Updating a Deployed Service

```bash
# Make code changes
# Commit changes to version control

# Navigate to service
cd u2-authentication  # or u3-project

# Run tests
npm test

# Deploy update
cd infrastructure
cdk deploy --context environment=development
```

### Rolling Back a Deployment

See [Rollback Procedures](../operations/incident-response.md#rollback-procedures) for detailed rollback instructions.

---

## 🆘 Support and Contacts

For deployment issues or questions:

1. Check [Troubleshooting Guide](../operations/troubleshooting.md)
2. Review [CloudWatch Logs](../monitoring/cloudwatch-setup.md)
3. Contact DevOps team
4. Escalate to engineering lead if needed

---

**Next Steps**: After successful deployment, proceed to [Monitoring Setup](../monitoring/cloudwatch-setup.md) to configure comprehensive monitoring and alerting.