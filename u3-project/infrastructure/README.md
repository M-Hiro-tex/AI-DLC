# U3-Project Infrastructure

AWS CDK infrastructure for the U3-Project service.

## Overview

This CDK stack deploys:
- **DynamoDB Table**: Single-table design with GSIs for project storage
- **Lambda Function**: Node.js 18 runtime with Express app
- **API Gateway**: REST API with CORS and throttling
- **CloudWatch Alarms**: Production monitoring (errors, throttles, latency)
- **IAM Roles**: Minimal permissions for Lambda

## Prerequisites

- **AWS CLI**: Configured with appropriate credentials
- **AWS CDK**: `npm install -g aws-cdk`
- **Node.js**: 18.x or higher
- **Deployment Environment Variables**:
  - `JWT_SECRET`: Secret key for JWT validation
  - `AUTH_SERVICE_URL`: Authentication service endpoint

## Installation

```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap
```

## Deployment

### Quick Deploy (Development)

```bash
cd ..
./scripts/deploy.sh dev your-jwt-secret https://auth.example.com
```

### Manual Deploy

```bash
# Build the application first
cd ..
./scripts/build.sh

# Deploy with CDK
cd infrastructure
cdk deploy \
  -c environment=dev \
  -c jwtSecret=your-secret \
  -c authServiceUrl=https://auth.example.com
```

### Deploy to Different Environments

```bash
# Development
./scripts/deploy.sh dev your-secret https://auth-dev.example.com

# Staging
./scripts/deploy.sh staging your-secret https://auth-staging.example.com

# Production
./scripts/deploy.sh prod your-secret https://auth-prod.example.com
```

## Stack Resources

### DynamoDB Table

**Name**: `ProjectDomain-{environment}`

**Attributes**:
- `PK` (Partition Key): Primary identifier
- `SK` (Sort Key): Sort identifier
- `GSI1PK` / `GSI1SK`: Owner index
- `GSI2PK` / `GSI2SK`: Template index

**Billing**: Pay-per-request

**Features**:
- Point-in-time recovery (production only)
- AWS managed encryption
- TTL attribute for automatic deletion

### Lambda Function

**Name**: `u3-project-{environment}`

**Runtime**: Node.js 18.x

**Memory**:
- Dev: 256 MB
- Production: 512 MB

**Timeout**: 30 seconds

**Features**:
- X-Ray tracing enabled
- CloudWatch Logs integration
- Lambda Powertools for observability

### API Gateway

**Name**: `u3-project-api-{environment}`

**Type**: REST API

**Features**:
- CORS enabled
- Request throttling (1000 req/sec, 2000 burst)
- CloudWatch metrics and logging
- X-Ray tracing

**Stage**: `{environment}`

### CloudWatch Alarms (Production Only)

- **Lambda Errors**: >10 errors in 2 periods
- **Lambda Throttles**: >5 throttles in 2 periods
- **API 4XX Errors**: >100 errors in 5 periods
- **API 5XX Errors**: >10 errors in 2 periods
- **DynamoDB Throttles**: >10 throttles in 2 periods

## CDK Commands

```bash
# Synthesize CloudFormation template
npm run synth

# Deploy stack
npm run deploy

# Show differences
npm run diff

# Destroy stack
npm run destroy

# List stacks
cdk list
```

## Stack Outputs

After deployment, the stack provides:

- **ApiEndpoint**: API Gateway URL
- **TableName**: DynamoDB table name
- **LambdaFunctionName**: Lambda function name
- **LambdaFunctionArn**: Lambda function ARN

View outputs:
```bash
cdk output
```

## Environment Configuration

The stack accepts these context variables:

- **environment** (required): `dev`, `staging`, or `prod`
- **jwtSecret** (required): JWT secret key
- **authServiceUrl** (required): Authentication service URL

Example:
```bash
cdk deploy \
  -c environment=prod \
  -c jwtSecret=production-secret \
  -c authServiceUrl=https://auth.example.com
```

## Post-Deployment

### 1. Seed Templates

```bash
# Get table name from stack outputs
TABLE_NAME=$(aws cloudformation describe-stacks \
  --stack-name U3ProjectStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`TableName`].OutputValue' \
  --output text)

# Seed templates
cd ..
./scripts/seed-templates.sh $TABLE_NAME us-east-1
```

### 2. Test API

```bash
# Get API endpoint
API_URL=$(aws cloudformation describe-stacks \
  --stack-name U3ProjectStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

# Test health check
curl $API_URL/health

# Test with authentication
curl -H "Authorization: Bearer your-jwt-token" \
  $API_URL/api/v1/projects
```

## Monitoring

### CloudWatch Logs

Logs are stored in:
```
/aws/lambda/u3-project-{environment}
```

View logs:
```bash
aws logs tail /aws/lambda/u3-project-dev --follow
```

### Metrics

Key metrics to monitor:
- Lambda: Invocations, Errors, Duration, Throttles
- API Gateway: Count, 4XXError, 5XXError, Latency
- DynamoDB: ConsumedReadCapacityUnits, ConsumedWriteCapacityUnits, UserErrors

### X-Ray Tracing

View traces in AWS X-Ray console for request flow analysis.

## Troubleshooting

### Deployment Fails

**Issue**: `Resource already exists`
```bash
# Check existing stacks
cdk list
# Destroy conflicting stack
cdk destroy U3ProjectStack-dev
```

**Issue**: `Insufficient permissions`
```bash
# Check AWS credentials
aws sts get-caller-identity
# Ensure IAM user has necessary permissions
```

### Lambda Errors

**Issue**: Lambda function errors in production
```bash
# Check CloudWatch Logs
aws logs tail /aws/lambda/u3-project-prod --follow

# Check recent errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/u3-project-prod \
  --filter-pattern "ERROR"
```

### DynamoDB Throttling

**Issue**: DynamoDB throttling errors
```bash
# Check table metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=ProjectDomain-prod \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Security

### Secrets Management

**DO NOT** commit secrets to version control. Use:

1. **AWS Secrets Manager** (recommended for production)
2. **Environment variables** (for development)
3. **CDK context** (pass at deploy time)

### IAM Permissions

Lambda function has minimal permissions:
- DynamoDB: Read/Write to table only
- CloudWatch: Logs and metrics
- X-Ray: Tracing data

## Cost Optimization

### Development

- Use on-demand billing for DynamoDB
- Lower Lambda memory (256 MB)
- Shorter log retention (1 week)
- Auto-deletion of stack resources

### Production

- Consider provisioned capacity for DynamoDB if predictable load
- Higher Lambda memory for better performance
- Longer log retention (1 month)
- Enable point-in-time recovery
- Retain resources on stack deletion

## Updating Infrastructure

```bash
# 1. Make changes to stack code
# 2. Review changes
npm run diff

# 3. Deploy changes
npm run deploy
```

## Cleanup

```bash
# Destroy the stack
cdk destroy

# Verify deletion
aws cloudformation list-stacks --stack-status-filter DELETE_COMPLETE
```

**Note**: Production stacks retain DynamoDB table by default. Manual deletion required.

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [API Gateway Best Practices](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-documentation.html)