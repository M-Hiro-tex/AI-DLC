# U2 Authentication Infrastructure

This directory contains AWS CDK infrastructure code for the U2 Authentication Domain.

## Prerequisites

- Node.js 18.x or later
- AWS CLI configured with appropriate credentials
- AWS CDK CLI: `npm install -g aws-cdk`

## Installation

```bash
cd u2-authentication/infrastructure
npm install
```

## Configuration

### Environment Variables

Set the deployment stage:
```bash
export STAGE=dev  # or staging, prod
```

### CDK Context

Configure alert email for CloudWatch alarms:
```bash
cdk deploy --context alertEmail=ops@example.com --context stage=dev
```

### OAuth Secrets

After deployment, update OAuth credentials in Secrets Manager:

```bash
# Update Google OAuth credentials
aws secretsmanager put-secret-value \
  --secret-id /dev/u2-authentication/oauth \
  --secret-string '{
    "GOOGLE_CLIENT_ID": "your-google-client-id",
    "GOOGLE_CLIENT_SECRET": "your-google-client-secret",
    "GITHUB_CLIENT_ID": "your-github-client-id",
    "GITHUB_CLIENT_SECRET": "your-github-client-secret"
  }'
```

## Deployment

### Build Application Code First

Before deploying infrastructure, build the application code:

```bash
cd ../  # Back to u2-authentication root
npm install
npm run build  # Creates dist/ directory
```

### Synthesize CloudFormation Template

```bash
cd infrastructure
npm run synth
```

### Deploy to AWS

#### Development Environment
```bash
cdk deploy --context stage=dev
```

#### Staging Environment
```bash
cdk deploy --context stage=staging
```

#### Production Environment
```bash
cdk deploy --context stage=prod --context alertEmail=ops@example.com
```

### View Differences Before Deployment

```bash
cdk diff --context stage=dev
```

## Infrastructure Components

### Networking
- **VPC**: Multi-AZ VPC with public, private, and isolated subnets
- **NAT Gateways**: 1 for dev, 2 for prod
- **Security Groups**: Separate groups for Lambda and Aurora

### Database
- **Aurora Serverless v2**: PostgreSQL 15.3
- **Capacity**: 0.5-4 ACU (dev), 2-16 ACU (prod)
- **Backups**: 7 days (dev), 30 days (prod)
- **Encryption**: At-rest encryption enabled
- **Monitoring**: CloudWatch Logs enabled

### Compute
- **Lambda Function**: Node.js 20.x runtime
- **Memory**: 256 MB (dev), 512 MB (prod)
- **Timeout**: 30 seconds
- **VPC**: Deployed in private subnets
- **X-Ray Tracing**: Enabled
- **Reserved Concurrency**: 100 (prod only)

### API
- **API Gateway**: REST API with Lambda proxy integration
- **Throttling**: 50 req/s (dev), 2000 req/s (prod)
- **CORS**: Configured for frontend origins
- **Logging**: Full request/response logging (non-prod)
- **Tracing**: X-Ray enabled

### Security
- **WAF**: AWS Managed Rules (prod only)
  - Rate limiting: 2000 req/5min per IP
  - Common rule set
  - Known bad inputs protection
- **Secrets Manager**: 
  - Database credentials (auto-generated)
  - JWT secret (auto-generated)
  - OAuth credentials (manual configuration required)

### Monitoring
- **CloudWatch Alarms**:
  - Lambda error rate
  - Lambda duration
  - Lambda throttles
  - API Gateway 5XX errors
  - Database capacity
- **SNS Topic**: Alert notifications
- **Metrics**: Custom metrics for authentication flows

## Outputs

After deployment, the following outputs are available:

- `ApiUrl`: Authentication API endpoint
- `DatabaseEndpoint`: Aurora cluster endpoint
- `DatabaseCredentialsSecret`: ARN of database credentials secret
- `LambdaFunctionArn`: Lambda function ARN
- `AlertTopicArn`: SNS alert topic ARN

View outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name U2AuthenticationStack-dev \
  --query 'Stacks[0].Outputs'
```

## Database Migration

After infrastructure deployment, run database migrations:

```bash
cd ../scripts
./migrate-db.sh dev
```

## Monitoring

### CloudWatch Dashboard

Access the auto-generated dashboard:
```bash
aws cloudwatch get-dashboard --dashboard-name U2-Authentication-dev
```

### View Logs

Lambda logs:
```bash
aws logs tail /aws/lambda/U2AuthenticationStack-dev-AuthFunction --follow
```

Database logs:
```bash
aws logs tail /aws/rds/cluster/u2authenticationstack-dev-authdatabase --follow
```

## Cleanup

⚠️ **Warning**: This will destroy all resources including databases

```bash
cdk destroy --context stage=dev
```

For production environments with deletion protection, first disable it in the stack code.

## Cost Optimization

### Development
- Aurora: Scales to 0 when idle
- Lambda: Pay-per-request
- NAT Gateway: 1 instance only
- Estimated monthly cost: $50-100

### Production
- Aurora: 2-16 ACU based on load
- Lambda: Reserved concurrency for predictability
- NAT Gateway: 2 instances for high availability
- WAF: Additional charges apply
- Estimated monthly cost: $200-500 (varies with traffic)

## Troubleshooting

### CDK Bootstrap Required

If you see "CDK Toolkit stack does not exist", run:
```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### Lambda Deployment Package Too Large

If the dist/ folder is too large for direct Lambda deployment:
1. Enable Lambda layers for node_modules
2. Or use ECR container images instead

### OAuth Secrets Not Set

Error: "Google OAuth failed" - Update OAuth secrets in Secrets Manager:
```bash
aws secretsmanager put-secret-value \
  --secret-id /<stage>/u2-authentication/oauth \
  --secret-string '{"GOOGLE_CLIENT_ID":"...","GOOGLE_CLIENT_SECRET":"..."}'
```

## Architecture Diagrams

See: `../docs/authentication-flow.md` for detailed architecture diagrams.

## Support

For infrastructure issues, contact: devops@example.com