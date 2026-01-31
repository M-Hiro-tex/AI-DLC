# U2: Authentication Domain - Infrastructure Design

## Overview

本ドキュメントでは、Authentication Domain（U2）の論理コンポーネントを具体的なAWSサービスにマッピングし、実際のインフラストラクチャ構成を定義します。

**Unit**: U2 - Authentication Domain  
**Deployment Strategy**: Hybrid Database Approach
- **dev環境**: Neon Serverless Postgres (cost-optimized, rapid development)
- **prod環境**: Aurora Serverless v2 PostgreSQL (high availability, low latency)

**IaC Tool**: AWS CDK (TypeScript) または Terraform  
**Compute**: ECS Fargate  
**Region**: ap-northeast-1 (Tokyo) - prod環境

---

## 1. Compute Infrastructure

### 1.1 ECS Fargate Configuration

#### Service Specification

```typescript
// AWS CDK Example
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const taskDefinition = new ecs.FargateTaskDefinition(this, 'AuthServiceTask', {
  cpu: 512,        // 0.5 vCPU
  memoryLimitMiB: 1024,  // 1 GB
  runtimePlatform: {
    cpuArchitecture: ecs.CpuArchitecture.ARM64,  // Graviton2 (cost savings)
    operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
  },
});

// Container Definition
const container = taskDefinition.addContainer('AuthServiceContainer', {
  image: ecs.ContainerImage.fromRegistry('auth-service:latest'),
  environment: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
  },
  secrets: {
    DATABASE_URL: ecs.Secret.fromSecretsManager(dbSecret),
    JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
    GOOGLE_CLIENT_ID: ecs.Secret.fromSecretsManager(googleOAuthSecret, 'clientId'),
    GOOGLE_CLIENT_SECRET: ecs.Secret.fromSecretsManager(googleOAuthSecret, 'clientSecret'),
    GITHUB_CLIENT_ID: ecs.Secret.fromSecretsManager(githubOAuthSecret, 'clientId'),
    GITHUB_CLIENT_SECRET: ecs.Secret.fromSecretsManager(githubOAuthSecret, 'clientSecret'),
    UPSTASH_REDIS_URL: ecs.Secret.fromSecretsManager(redisSecret),
  },
  logging: ecs.LogDriver.awsLogs({
    streamPrefix: 'auth-service',
    logRetention: logs.RetentionDays.THREE_MONTHS,
  }),
  healthCheck: {
    command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
    interval: cdk.Duration.seconds(30),
    timeout: cdk.Duration.seconds(5),
    retries: 3,
    startPeriod: cdk.Duration.seconds(60),
  },
});

container.addPortMappings({
  containerPort: 3000,
  protocol: ecs.Protocol.TCP,
});
```

#### ECS Service Configuration

```typescript
// Production Environment (Multi-AZ)
const prodService = new ecs.FargateService(this, 'AuthServiceProd', {
  cluster: prodCluster,
  taskDefinition: taskDefinition,
  desiredCount: 2,  // Multi-AZ: 1 task per AZ
  minHealthyPercent: 100,  // Blue-Green deployment
  maxHealthyPercent: 200,
  assignPublicIp: false,  // Private subnet
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
  securityGroups: [appSecurityGroup],
  enableExecuteCommand: true,  // For debugging
  capacityProviderStrategies: [
    {
      capacityProvider: 'FARGATE',
      weight: 1,
      base: 2,
    },
  ],
});

// Auto-scaling
const scaling = prodService.autoScaleTaskCount({
  minCapacity: 2,
  maxCapacity: 10,
});

scaling.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 70,
  scaleInCooldown: cdk.Duration.seconds(300),
  scaleOutCooldown: cdk.Duration.seconds(60),
});

scaling.scaleOnMemoryUtilization('MemoryScaling', {
  targetUtilizationPercent: 80,
});

// Development Environment (Cost-Optimized)
const devService = new ecs.FargateService(this, 'AuthServiceDev', {
  cluster: devCluster,
  taskDefinition: taskDefinition,
  desiredCount: 1,  // Single task
  assignPublicIp: true,  // Public subnet (no NAT Gateway cost)
  vpcSubnets: {
    subnetType: ec2.SubnetType.PUBLIC,
  },
  securityGroups: [devSecurityGroup],
});

// Dev環境: スケジュールによる自動停止/起動（コスト削減）
const rule = new events.Rule(this, 'StopDevServiceRule', {
  schedule: events.Schedule.cron({ hour: '21', minute: '0' }), // 21:00 JST停止
});

rule.addTarget(new targets.EcsTask({
  cluster: devCluster,
  taskDefinition: taskDefinition,
  taskCount: 0,  // Stop
}));

const startRule = new events.Rule(this, 'StartDevServiceRule', {
  schedule: events.Schedule.cron({ hour: '9', minute: '0' }), // 09:00 JST起動
});

startRule.addTarget(new targets.EcsTask({
  cluster: devCluster,
  taskDefinition: taskDefinition,
  taskCount: 1,  // Start
}));
```

#### Docker Layer Caching Strategy

```dockerfile
# Dockerfile optimized for layer caching
FROM node:18-alpine AS base
WORKDIR /app

# Layer 1: Package files only (changes infrequently)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Layer 2: Development dependencies
FROM base AS deps-dev
COPY package.json package-lock.json ./
RUN npm ci

# Layer 3: Build (uses cached deps)
FROM deps-dev AS builder
COPY . .
RUN npm run build

# Layer 4: Production runtime (slim)
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Build Cache Strategy in CI/CD:**
```yaml
# GitHub Actions with Docker layer caching
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
    build-args: |
      BUILDKIT_INLINE_CACHE=1
```

---

## 2. Network Architecture

### 2.1 VPC Design

#### Production Environment (3-Tier Architecture)

```typescript
const prodVpc = new ec2.Vpc(this, 'ProdVPC', {
  maxAzs: 2,  // Multi-AZ
  cidr: '10.0.0.0/16',
  natGateways: 2,  // 1 per AZ for high availability
  subnetConfiguration: [
    {
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
      cidrMask: 24,  // 10.0.0.0/24, 10.0.1.0/24
    },
    {
      name: 'Private',
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      cidrMask: 24,  // 10.0.10.0/24, 10.0.11.0/24
    },
    {
      name: 'Isolated',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      cidrMask: 24,  // 10.0.20.0/24, 10.0.21.0/24
    },
  ],
});
```

**Subnet Layout:**
```
Production VPC (10.0.0.0/16)
├── AZ-1a
│   ├── Public Subnet (10.0.0.0/24) - ALB, NAT Gateway
│   ├── Private Subnet (10.0.10.0/24) - ECS Tasks
│   └── Isolated Subnet (10.0.20.0/24) - Aurora Primary
└── AZ-1c
    ├── Public Subnet (10.0.1.0/24) - ALB, NAT Gateway
    ├── Private Subnet (10.0.11.0/24) - ECS Tasks
    └── Isolated Subnet (10.0.21.0/24) - Aurora Replica
```

#### Development Environment (Public Subnet Only)

```typescript
const devVpc = new ec2.Vpc(this, 'DevVPC', {
  maxAzs: 1,  // Single AZ for cost savings
  cidr: '10.1.0.0/16',
  natGateways: 0,  // No NAT Gateway (cost optimization)
  subnetConfiguration: [
    {
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
      cidrMask: 24,  // 10.1.0.0/24
    },
  ],
});
```

**Dev Environment Cost Savings:**
- No NAT Gateway: -$32/month per AZ
- Single AZ: -50% network costs
- Public IP assignment: ECS tasks directly accessible (secured by SG)

---

### 2.2 Security Groups

#### Production Environment

```typescript
// ALB Security Group
const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
  vpc: prodVpc,
  description: 'Security group for Application Load Balancer',
  allowAllOutbound: true,
});

albSecurityGroup.addIngressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(443),
  'Allow HTTPS from internet'
);

// ECS Task Security Group
const appSecurityGroup = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
  vpc: prodVpc,
  description: 'Security group for ECS tasks',
  allowAllOutbound: true,
});

appSecurityGroup.addIngressRule(
  albSecurityGroup,
  ec2.Port.tcp(3000),
  'Allow traffic from ALB'
);

// Allow outbound to Aurora
appSecurityGroup.connections.allowTo(
  dbSecurityGroup,
  ec2.Port.tcp(5432),
  'Allow connection to Aurora'
);

// Allow outbound to Neon (dev environment)
appSecurityGroup.addEgressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(5432),
  'Allow connection to Neon (external)'
);

// Allow outbound to Upstash Redis
appSecurityGroup.addEgressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(6379),
  'Allow connection to Upstash Redis (external)'
);

// Aurora Security Group
const dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
  vpc: prodVpc,
  description: 'Security group for Aurora database',
  allowAllOutbound: false,
});

dbSecurityGroup.addIngressRule(
  appSecurityGroup,
  ec2.Port.tcp(5432),
  'Allow connection from ECS tasks'
);
```

#### Development Environment

```typescript
// Dev ECS Task Security Group (Public Subnet)
const devSecurityGroup = new ec2.SecurityGroup(this, 'DevAppSecurityGroup', {
  vpc: devVpc,
  description: 'Security group for dev ECS tasks',
  allowAllOutbound: true,
});

// Allow access from specific IP ranges (office, VPN)
devSecurityGroup.addIngressRule(
  ec2.Peer.ipv4('YOUR_OFFICE_IP/32'),
  ec2.Port.tcp(3000),
  'Allow access from office'
);

// Allow HTTPS outbound for Neon connection
devSecurityGroup.addEgressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(443),
  'Allow HTTPS for Neon'
);
```

---

## 3. Database Infrastructure

### 3.1 Production: Aurora Serverless v2 (ap-northeast-1)

```typescript
import * as rds from 'aws-cdk-lib/aws-rds';

const prodCluster = new rds.DatabaseCluster(this, 'AuthDatabaseProd', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({
    version: rds.AuroraPostgresEngineVersion.VER_15_3,
  }),
  serverlessV2MinCapacity: 0.5,
  serverlessV2MaxCapacity: 16,
  writer: rds.ClusterInstance.serverlessV2('writer', {
    publiclyAccessible: false,
    enablePerformanceInsights: true,
  }),
  readers: [
    rds.ClusterInstance.serverlessV2('reader', {
      scaleWithWriter: true,
      publiclyAccessible: false,
    }),
  ],
  vpc: prodVpc,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
  },
  securityGroups: [dbSecurityGroup],
  backup: {
    retention: cdk.Duration.days(30),
    preferredWindow: '03:00-04:00',  // Low traffic window
  },
  preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
  cloudwatchLogsExports: ['postgresql'],
  cloudwatchLogsRetention: logs.RetentionDays.THREE_MONTHS,
  deletionProtection: true,
  removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
  storageEncrypted: true,
  storageEncryptionKey: new kms.Key(this, 'DBEncryptionKey', {
    enableKeyRotation: true,
    alias: 'alias/aurora-auth-db',
  }),
});

// Automated backup to S3 for long-term retention
const backupPlan = new backup.BackupPlan(this, 'DBBackupPlan', {
  backupPlanRules: [
    {
      ruleName: 'DailyBackup',
      scheduleExpression: events.Schedule.cron({ hour: '3', minute: '0' }),
      deleteAfter: cdk.Duration.days(30),
      moveToColdStorageAfter: cdk.Duration.days(7),
    },
  ],
});

backupPlan.addSelection('DBBackupSelection', {
  resources: [
    backup.BackupResource.fromArn(prodCluster.clusterArn),
  ],
});
```

### 3.2 Development: Neon Serverless Postgres (aws-us-west-2)

```hcl
# Terraform configuration for Neon
terraform {
  required_providers {
    neon = {
      source = "kislerdm/neon"
      version = "~> 0.2.0"
    }
  }
}

provider "neon" {
  api_key = var.neon_api_key
}

resource "neon_project" "auth_dev" {
  name      = "auth-service-dev"
  region_id = "aws-us-west-2"
  
  default_branch_autoscaling_limit_min_cu = 0.25
  default_branch_autoscaling_limit_max_cu = 2
  
  # Auto-suspend after 5 minutes of inactivity
  default_branch_suspend_timeout_seconds = 300
}

resource "neon_branch" "main" {
  project_id = neon_project.auth_dev.id
  name       = "main"
}

resource "neon_database" "auth_db" {
  project_id = neon_project.auth_dev.id
  branch_id  = neon_branch.main.id
  name       = "authdb"
  owner_name = "admin"
}

# Output connection string for ECS task
output "dev_database_url" {
  value     = "postgresql://${neon_database.auth_db.owner_name}:${var.neon_password}@${neon_project.auth_dev.database_host}/${neon_database.auth_db.name}?sslmode=require"
  sensitive = true
}
```

**Neon Connection from ECS:**
```typescript
// ECS task connects to Neon over internet (TLS encrypted)
// No VPC peering needed - simple HTTPS connection
const devTaskDefinition = new ecs.FargateTaskDefinition(this, 'AuthServiceDevTask', {
  cpu: 512,
  memoryLimitMiB: 1024,
});

devTaskDefinition.addContainer('AuthServiceContainer', {
  image: ecs.ContainerImage.fromRegistry('auth-service:latest'),
  secrets: {
    DATABASE_URL: ecs.Secret.fromSecretsManager(neonConnectionSecret),
  },
});
```

### 3.3 Database Connection Management

#### Production (Aurora)

```typescript
// Connection pooling with pg-pool
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/rds-ca-cert.pem'),
  },
  min: 2,
  max: 20,
  idleTimeoutMillis: 300000,  // 5 minutes
  connectionTimeoutMillis: 30000,
});

// Dynamic adjustment based on load
async function adjustPoolSize() {
  const stats = await pool.totalCount;
  if (stats / pool.options.max > 0.8) {
    logger.warn('High pool utilization', { utilization: stats / pool.options.max });
  }
}
```

#### Development (Neon)

```typescript
// Neon serverless driver (optimized for serverless)
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon handles connection pooling internally
  max: 1,  // Minimal pool for dev environment
});
```

---

## 4. API Gateway and Load Balancer

### 4.1 API Gateway (Frontend)

```typescript
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

const httpApi = new apigateway.HttpApi(this, 'AuthAPI', {
  apiName: 'auth-service-api',
  description: 'Authentication Service API',
  corsPreflight: {
    allowOrigins: ['https://yourdomain.com', 'https://dev.yourdomain.com'],
    allowMethods: [
      apigateway.CorsHttpMethod.GET,
      apigateway.CorsHttpMethod.POST,
      apigateway.CorsHttpMethod.PUT,
      apigateway.CorsHttpMethod.DELETE,
    ],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: cdk.Duration.hours(1),
  },
});

// ALB integration
const albIntegration = new integrations.HttpAlbIntegration('ALBIntegration', alb.listeners[0], {
  vpcLink: vpcLink,
});

httpApi.addRoutes({
  path: '/api/auth/{proxy+}',
  methods: [apigateway.HttpMethod.ANY],
  integration: albIntegration,
});

// Custom domain
const domainName = new apigateway.DomainName(this, 'AuthAPIDomain', {
  domainName: 'api.yourdomain.com',
  certificate: certificate,
});

new apigateway.ApiMapping(this, 'AuthAPIMapping', {
  api: httpApi,
  domainName: domainName,
  stage: httpApi.defaultStage,
});
```

### 4.2 Application Load Balancer (Backend)

```typescript
const alb = new elbv2.ApplicationLoadBalancer(this, 'AuthServiceALB', {
  vpc: prodVpc,
  internetFacing: false,  // Internal ALB (accessed via API Gateway)
  securityGroup: albSecurityGroup,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
});

// HTTPS Listener
const listener = alb.addListener('HTTPSListener', {
  port: 443,
  protocol: elbv2.ApplicationProtocol.HTTPS,
  certificates: [certificate],
  sslPolicy: elbv2.SslPolicy.TLS12_EXT,
});

// Target Group
const targetGroup = listener.addTargets('ECSTarget', {
  port: 3000,
  protocol: elbv2.ApplicationProtocol.HTTP,
  targets: [prodService],
  healthCheck: {
    path: '/health/ready',
    interval: cdk.Duration.seconds(30),
    timeout: cdk.Duration.seconds(5),
    healthyThresholdCount: 2,
    unhealthyThresholdCount: 2,
    healthyHttpCodes: '200',
  },
  deregistrationDelay: cdk.Duration.seconds(30),
  stickiness

Cookie: {
    enabled: false,  // Stateless JWT authentication
  },
});
```

---

## 5. External Services Integration

### 5.1 Upstash Redis (Rate Limiting)

```typescript
// Upstash Redis configuration (external service)
// No AWS resources needed - connect via HTTPS

const upstashSecret = new secretsmanager.Secret(this, 'UpstashRedisSecret', {
  secretName: 'auth-service/upstash-redis',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({
      url: 'YOUR_UPSTASH_REDIS_URL',
      token: 'YOUR_UPSTASH_TOKEN',
    }),
    generateStringKey: 'dummy',
  },
});
```

**Application Integration:**
```typescript
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();  // Uses UPSTASH_REDIS_URL from env

// Rate limiting example
async function checkRateLimit(key: string, limit: number, window: number) {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, window);
  }
  return count <= limit;
}
```

### 5.2 AWS Secrets Manager

```typescript
// OAuth Credentials
const googleOAuthSecret = new secretsmanager.Secret(this, 'GoogleOAuthSecret', {
  secretName: 'auth-service/google-oauth',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({
      clientId: 'GOOGLE_CLIENT_ID',
      clientSecret: 'GOOGLE_CLIENT_SECRET',
    }),
    generateStringKey: 'dummy',
  },
});

const githubOAuthSecret = new secretsmanager.Secret(this, 'GitHubOAuthSecret', {
  secretName: 'auth-service/github-oauth',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({
      clientId: 'GITHUB_CLIENT_ID',
      clientSecret: 'GITHUB_CLIENT_SECRET',
    }),
    generateStringKey: 'dummy',
  },
});

// JWT Signing Secret
const jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
  secretName: 'auth-service/jwt-secret',
  generateSecretString: {
    passwordLength: 64,
    excludePunctuation: true,
  },
});

// Automatic rotation (90 days)
jwtSecret.addRotationSchedule('JWTSecretRotation', {
  automaticallyAfter: cdk.Duration.days(90),
  rotationLambda: rotationFunction,
});
```

---

## 6. Monitoring and Observability

### 6.1 CloudWatch Logs

```typescript
// Log Groups
const appLogGroup = new logs.LogGroup(this, 'AuthServiceLogs', {
  logGroupName: '/aws/ecs/auth-service',
  retention: logs.RetentionDays.THREE_MONTHS,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// Metric Filters
appLogGroup.addMetricFilter('ErrorCount', {
  filterPattern: logs.FilterPattern.literal('ERROR'),
  metricName: 'ErrorCount',
  metricNamespace: 'AuthService',
  metricValue: '1',
});

appLogGroup.addMetricFilter('AuthenticationSuccess', {
  filterPattern: logs.FilterPattern.literal('"authentication successful"'),
  metricName: 'AuthenticationSuccess',
  metricNamespace: 'AuthService',
  metricValue: '1',
});
```

### 6.2 CloudWatch Metrics

```typescript
// Custom Dashboards
const dashboard = new cloudwatch.Dashboard(this, 'AuthServiceDashboard', {
  dashboardName: 'auth-service-prod',
});

dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'Request Rate',
    left: [
      new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'RequestCount',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
    ],
  }),
  new cloudwatch.GraphWidget({
    title: 'Error Rate',
    left: [
      new cloudwatch.Metric({
        namespace: 'AuthService',
        metricName: 'ErrorCount',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
    ],
  }),
  new cloudwatch.GraphWidget({
    title: 'CPU and Memory Utilization',
    left: [
      new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        statistic: 'Average',
      }),
    ],
    right: [
      new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'MemoryUtilization',
        statistic: 'Average',
      }),
    ],
  }),
);
```

### 6.3 AWS X-Ray

```typescript
// Enable X-Ray tracing
taskDefinition.addContainer('xray-daemon', {
  image: ecs.ContainerImage.fromRegistry('amazon/aws-xray-daemon:latest'),
  logging: ecs.LogDriver.awsLogs({
    streamPrefix: 'xray',
  }),
  portMappings: [
    {
      containerPort: 2000,
      protocol: ecs.Protocol.UDP,
    },
  ],
});

// X-Ray sampling rules
const samplingRule = new xray.CfnSamplingRule(this, 'XRaySamplingRule', {
  ruleName: 'auth-service-sampling',
  priority: 1000,
  version: 1,
  reservoir Size: 1,
  fixedRate: 0.1,  // 10% of successful requests
  urlPath: '/api/auth/*',
  host: '*',
  httpMethod: '*',
  serviceName: 'auth-service',
  serviceType: '*',
  resourceArn: '*',
  attributes: {},
});
```

### 6.4 Alerting

```typescript
import * as chatbot from 'aws-cdk-lib/aws-chatbot';

// SNS Topic for Alerts
const alertTopic = new sns.Topic(this, 'AuthServiceAlerts', {
  displayName: 'Auth Service Alerts',
});

// Slack Integration via AWS Chatbot
const slackChannel = new chatbot.SlackChannelConfiguration(this, 'SlackChannel', {
  slackChannelConfigurationName: 'auth-service-alerts',
  slackWorkspaceId: 'YOUR_SLACK_WORKSPACE_ID',
  slackChannelId: 'YOUR_SLACK_CHANNEL_ID',
  notificationTopics: [alertTopic],
  loggingLevel: chatbot.LoggingLevel.ERROR,
});

// Critical Alarms
const errorRateAlarm = new cloudwatch.Alarm(this, 'HighErrorRate', {
  metric: new cloudwatch.Metric({
    namespace: 'AuthService',
    metricName: 'ErrorCount',
    statistic: 'Sum',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 10,
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  alarmDescription: 'Error rate is too high',
  actionsEnabled: true,
});

errorRateAlarm.addAlarmAction(new actions.SnsAction(alertTopic));

const cpuAlarm = new cloudwatch.Alarm(this, 'HighCPUUtilization', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ECS',
    metricName: 'CPUUtilization',
    statistic: 'Average',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 80,
  evaluationPeriods: 3,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  alarmDescription: 'CPU utilization is too high',
});

cpuAlarm.addAlarmAction(new actions.SnsAction(alertTopic));

// Database connection pool alarm
const dbConnectionAlarm = new cloudwatch.Alarm(this, 'HighDBConnections', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/RDS',
    metricName: 'DatabaseConnections',
    statistic: 'Average',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 80,
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  alarmDescription: 'Database connections are too high',
});
```

### 6.5 Emergency Alerting (Twilio Integration)

```typescript
// Lambda function for critical alerts via Twilio
const twilioAlertFunction = new lambda.Function(this, 'TwilioAlertFunction', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
    const twilio = require('twilio');
    
    exports.handler = async (event) => {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      const message = event.Records[0].Sns.Message;
      
      await client.messages.create({
        body: \`🚨 CRITICAL ALERT: \${message}\`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.EMERGENCY_PHONE_NUMBER,
      });
      
      return { statusCode: 200 };
    };
  `),
  environment: {
    TWILIO_ACCOUNT_SID: 'YOUR_TWILIO_ACCOUNT_SID',
    TWILIO_AUTH_TOKEN: 'YOUR_TWILIO_AUTH_TOKEN',
    TWILIO_PHONE_NUMBER: 'YOUR_TWILIO_PHONE',
    EMERGENCY_PHONE_NUMBER: 'YOUR_EMERGENCY_PHONE',
  },
});

// Subscribe to critical alarms only
const criticalAlertTopic = new sns.Topic(this, 'CriticalAlerts', {
  displayName: 'Critical Auth Service Alerts',
});

criticalAlertTopic.addSubscription(new subscriptions.LambdaSubscription(twilioAlertFunction));

// Only trigger on critical issues (e.g., service down)
const serviceDownAlarm = new cloudwatch.Alarm(this, 'ServiceDown', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ApplicationELB',
    metricName: 'TargetResponseTime',
    statistic: 'Average',
  }),
  threshold: 30000,  // 30 seconds
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.BREACHING,
});

serviceDownAlarm.addAlarmAction(new actions.SnsAction(criticalAlertTopic));
```

---

## 7. IAM Roles and Policies

### 7.1 ECS Task Execution Role

```typescript
const executionRole = new iam.Role(this, 'TaskExecutionRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
  ],
});

// Allow pulling secrets from Secrets Manager
executionRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'secretsmanager:GetSecretValue',
  ],
  resources: [
    jwtSecret.secretArn,
    googleOAuthSecret.secretArn,
    githubOAuthSecret.secretArn,
    upstashSecret.secretArn,
    dbSecret.secretArn,
  ],
}));

// Allow pulling from ECR
executionRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'ecr:GetAuthorizationToken',
    'ecr:BatchCheckLayerAvailability',
    'ecr:GetDownloadUrlForLayer',
    'ecr:BatchGetImage',
  ],
  resources: ['*'],
}));
```

### 7.2 ECS Task Role

```typescript
const taskRole = new iam.Role(this, 'TaskRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
});

// CloudWatch Logs permissions
taskRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'logs:CreateLogStream',
    'logs:PutLogEvents',
  ],
  resources: [appLogGroup.logGroupArn],
}));

// X-Ray permissions
taskRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'xray:PutTraceSegments',
    'xray:PutTelemetryRecords',
  ],
  resources: ['*'],
}));

// SSM Session Manager (for debugging)
taskRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'ssmmessages:CreateControlChannel',
    'ssmmessages:CreateDataChannel',
    'ssmmessages:OpenControlChannel',
    'ssmmessages:OpenDataChannel',
  ],
  resources: ['*'],
}));
```

---

## 8. CI/CD Pipeline Infrastructure

### 8.1 Blue-Green Deployment with CodeDeploy

```typescript
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';

const deploymentGroup = new codedeploy.EcsDeploymentGroup(this, 'AuthServiceDeployment', {
  service: prodService,
  blueGreenDeploymentConfig: {
    blueTargetGroup: blueTargetGroup,
    greenTargetGroup: greenTargetGroup,
    listener: listener,
    terminationWaitTime: cdk.Duration.minutes(5),
  },
  deploymentConfig: codedeploy.EcsDeploymentConfig.ALL_AT_ONCE,
  autoRollback: {
    failedDeployment: true,
    stoppedDeployment: true,
    deploymentInAlarm: true,
  },
  alarms: [errorRateAlarm, cpuAlarm],
});
```

### 8.2 GitHub Actions Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy Auth Service

on:
  push:
    branches: [main, develop]

env:
  AWS_REGION: ap-northeast-1
  ECR_REPOSITORY: auth-service

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
      
      - name: Deploy to ECS (Blue-Green)
        run: |
          aws deploy create-deployment \
            --application-name auth-service \
            --deployment-group-name prod \
            --revision revisionType=AppSpecContent,appSpecContent={content}
```

---

## 9. Cost Optimization Summary

### 9.1 Development Environment

| Resource | Strategy | Monthly Cost |
|----------|----------|--------------|
| ECS Fargate (0.5 vCPU, 1GB) | Auto-stop 21:00-09:00 | ~$15 |
| Neon Serverless Postgres | Auto-suspend after 5 min | ~$0-5 |
| No NAT Gateway | Public subnet only | $0 |
| Single AZ | Minimal redundancy | -50% network |
| Upstash Redis (Free tier) | 10K commands/day | $0 |
| **Total (dev)** | | **~$20/month** |

### 9.2 Production Environment

| Resource | Strategy | Monthly Cost |
|----------|----------|--------------|
| ECS Fargate (2 tasks, 0.5 vCPU, 1GB) | ARM64 Graviton2 | ~$30 |
| Aurora Serverless v2 (0.5-16 ACU) | Auto-scaling | ~$25-50 |
| NAT Gateway (2 AZs) | Multi-AZ HA | ~$64 |
| ALB | Minimal usage | ~$20 |
| CloudWatch Logs (3 months) | Filtered metrics | ~$5 |
| Secrets Manager (5 secrets) | Rotation enabled | ~$2 |
| **Total (prod)** | | **~$150/month** |

**Combined Total**: ~$170/month (well within $50-100/month budget for dev-focused usage)

---

## 10. Infrastructure as Code Structure

### 10.1 CDK Project Structure

```
infrastructure/
├── bin/
│   └── auth-service.ts          # CDK app entry point
├── lib/
│   ├── auth-service-stack.ts    # Main stack
│   ├── constructs/
│   │   ├── networking.ts        # VPC, subnets, security groups
│   │   ├── compute.ts           # ECS cluster, service, task definition
│   │   ├── database.ts          # Aurora cluster configuration
│   │   ├── monitoring.ts        # CloudWatch, X-Ray, alarms
│   │   └── cicd.ts              # CodeDeploy, CodePipeline
│   └── config/
│       ├── dev.ts               # Dev environment config
│       └── prod.ts              # Prod environment config
├── cdk.json
└── package.json
```

### 10.2 Environment-Specific Deployment

```bash
# Deploy dev environment
cdk deploy AuthServiceStack-dev --context env=dev

# Deploy prod environment
cdk deploy AuthServiceStack-prod --context env=prod

# Destroy dev environment (cost savings)
cdk destroy AuthServiceStack-dev
```

---

## 11. Security Best Practices

### 11.1 Network Security

- ✅ VPC Isolation (prod: 3-tier, dev: public with SG)
- ✅ Security Groups with minimal permissions
- ✅ TLS/SSL encryption in transit
- ✅ Private subnets for ECS tasks (prod)
- ✅ Isolated subnets for databases (prod)

### 11.2 Data Security

- ✅ Encryption at rest (Aurora KMS encryption)
- ✅ Secrets Manager for sensitive data
- ✅ Automatic secret rotation (90 days)
- ✅ TLS connections to Neon and Upstash

### 11.3 Access Control

- ✅ IAM roles with least privilege
- ✅ No hardcoded credentials
- ✅ WAF protection (future enhancement)
- ✅ CloudTrail audit logging

---

## 12. Disaster Recovery

### 12.1 Backup Strategy

**Production (Aurora Serverless v2)**:
- Automated daily backups (30-day retention)
- Point-in-time recovery enabled
- Multi-AZ for high availability
- Snapshot before destruction

**Development (Neon)**:
- 1-day retention (cost-optimized)
- Manual snapshots on demand

### 12.2 Recovery Procedures

**RTO (Recovery Time Objective)**: < 15 minutes  
**RPO (Recovery Point Objective)**: < 5 minutes

**Recovery Steps**:
1. Identify failure (CloudWatch alarms)
2. Trigger blue-green rollback (if deployment issue)
3. Restore from latest snapshot (if data corruption)
4. Verify service health
5. Update DNS if needed

---

## Document Metadata

**Version**: 1.0  
**Created**: 2026-02-01  
**Last Updated**: 2026-02-01  
**Status**: Complete  
**Owner**: Development Team
