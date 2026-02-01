import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as path from 'path';

export interface U2AuthenticationStackProps extends cdk.StackProps {
  stage: string;
}

export class U2AuthenticationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: U2AuthenticationStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // ======================
    // VPC and Networking
    // ======================
    const vpc = new ec2.Vpc(this, 'U2AuthVpc', {
      maxAzs: 2,
      natGateways: stage === 'prod' ? 2 : 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Security Group for Lambda
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for U2 Authentication Lambda',
      allowAllOutbound: true,
    });

    // Security Group for Database
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora Serverless v2',
      allowAllOutbound: false,
    });

    // Allow Lambda to access database
    dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to access PostgreSQL'
    );

    // ======================
    // Secrets Manager
    // ======================
    
    // Database credentials
    const dbCredentials = new secretsmanager.Secret(this, 'DatabaseCredentials', {
      secretName: `/${stage}/u2-authentication/database`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'authuser' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
    });

    // JWT secret
    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      secretName: `/${stage}/u2-authentication/jwt`,
      generateSecretString: {
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 64,
      },
    });

    // OAuth credentials (must be set manually or via CLI)
    const oauthSecret = new secretsmanager.Secret(this, 'OAuthSecret', {
      secretName: `/${stage}/u2-authentication/oauth`,
      secretObjectValue: {
        GOOGLE_CLIENT_ID: cdk.SecretValue.unsafePlainText('YOUR_GOOGLE_CLIENT_ID'),
        GOOGLE_CLIENT_SECRET: cdk.SecretValue.unsafePlainText('YOUR_GOOGLE_CLIENT_SECRET'),
        GITHUB_CLIENT_ID: cdk.SecretValue.unsafePlainText('YOUR_GITHUB_CLIENT_ID'),
        GITHUB_CLIENT_SECRET: cdk.SecretValue.unsafePlainText('YOUR_GITHUB_CLIENT_SECRET'),
      },
    });

    // ======================
    // Aurora Serverless v2
    // ======================
    const dbCluster = new rds.DatabaseCluster(this, 'AuthDatabase', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3,
      }),
      credentials: rds.Credentials.fromSecret(dbCredentials),
      defaultDatabaseName: 'authentication',
      writer: rds.ClusterInstance.serverlessV2('writer', {
        scaleWithWriter: true,
      }),
      readers: stage === 'prod' ? [
        rds.ClusterInstance.serverlessV2('reader1', {
          scaleWithWriter: true,
        }),
      ] : [],
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      serverlessV2MinCapacity: stage === 'prod' ? 2 : 0.5,
      serverlessV2MaxCapacity: stage === 'prod' ? 16 : 4,
      backup: {
        retention: stage === 'prod' ? cdk.Duration.days(30) : cdk.Duration.days(7),
        preferredWindow: '03:00-04:00',
      },
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH,
      enableDataApi: false,
      storageEncrypted: true,
      deletionProtection: stage === 'prod',
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ======================
    // Lambda Function
    // ======================
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist')),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.seconds(30),
      memorySize: stage === 'prod' ? 512 : 256,
      environment: {
        NODE_ENV: stage,
        LOG_LEVEL: stage === 'prod' ? 'info' : 'debug',
        DB_HOST: dbCluster.clusterEndpoint.hostname,
        DB_PORT: dbCluster.clusterEndpoint.port.toString(),
        DB_NAME: 'authentication',
        DB_CREDENTIALS_SECRET: dbCredentials.secretArn,
        JWT_SECRET_ARN: jwtSecret.secretArn,
        OAUTH_SECRET_ARN: oauthSecret.secretArn,
        SESSION_EXPIRE_HOURS: '24',
        REFRESH_TOKEN_EXPIRE_DAYS: '30',
        FRONTEND_URL: stage === 'prod' ? 'https://app.example.com' : 'http://localhost:3000',
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
      tracing: lambda.Tracing.ACTIVE,
      reservedConcurrentExecutions: stage === 'prod' ? 100 : undefined,
    });

    // Grant permissions to access secrets
    dbCredentials.grantRead(authFunction);
    jwtSecret.grantRead(authFunction);
    oauthSecret.grantRead(authFunction);

    // Grant permissions to write X-Ray traces
    authFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
        ],
        resources: ['*'],
      })
    );

    // ======================
    // API Gateway
    // ======================
    const api = new apigateway.LambdaRestApi(this, 'AuthApi', {
      handler: authFunction,
      restApiName: `u2-authentication-${stage}`,
      description: `Authentication API - ${stage}`,
      deployOptions: {
        stageName: stage,
        throttlingBurstLimit: stage === 'prod' ? 5000 : 100,
        throttlingRateLimit: stage === 'prod' ? 2000 : 50,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: stage !== 'prod',
        metricsEnabled: true,
        tracingEnabled: true,
      },
      proxy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: stage === 'prod'
          ? ['https://app.example.com']
          : ['http://localhost:3000', 'http://localhost:3001'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'X-Request-ID',
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      },
    });

    // ======================
    // WAF
    // ======================
    if (stage === 'prod') {
      const webAcl = new wafv2.CfnWebACL(this, 'AuthApiWaf', {
        defaultAction: { allow: {} },
        scope: 'REGIONAL',
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'U2AuthWafMetrics',
          sampledRequestsEnabled: true,
        },
        rules: [
          // Rate limiting rule
          {
            name: 'RateLimitRule',
            priority: 1,
            statement: {
              rateBasedStatement: {
                limit: 2000,
                aggregateKeyType: 'IP',
              },
            },
            action: { block: {} },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: 'RateLimitRule',
              sampledRequestsEnabled: true,
            },
          },
          // AWS Managed Rules - Common Rule Set
          {
            name: 'AWSManagedRulesCommonRuleSet',
            priority: 2,
            statement: {
              managedRuleGroupStatement: {
                vendorName: 'AWS',
                name: 'AWSManagedRulesCommonRuleSet',
              },
            },
            overrideAction: { none: {} },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: 'AWSManagedRulesCommonRuleSetMetric',
              sampledRequestsEnabled: true,
            },
          },
          // AWS Managed Rules - Known Bad Inputs
          {
            name: 'AWSManagedRulesKnownBadInputsRuleSet',
            priority: 3,
            statement: {
              managedRuleGroupStatement: {
                vendorName: 'AWS',
                name: 'AWSManagedRulesKnownBadInputsRuleSet',
              },
            },
            overrideAction: { none: {} },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: 'AWSManagedRulesKnownBadInputsRuleSetMetric',
              sampledRequestsEnabled: true,
            },
          },
        ],
      });

      // Associate WAF with API Gateway
      new wafv2.CfnWebACLAssociation(this, 'AuthApiWafAssociation', {
        resourceArn: api.deploymentStage.stageArn,
        webAclArn: webAcl.attrArn,
      });
    }

    // ======================
    // CloudWatch Alarms & SNS
    // ======================
    
    // SNS Topic for alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      displayName: `U2 Authentication Alerts - ${stage}`,
    });

    // Add email subscription (configure via parameter)
    const alertEmail = this.node.tryGetContext('alertEmail');
    if (alertEmail) {
      alertTopic.addSubscription(new subscriptions.EmailSubscription(alertEmail));
    }

    // Lambda Error Rate Alarm
    const errorRateAlarm = new cloudwatch.Alarm(this, 'LambdaErrorRateAlarm', {
      metric: authFunction.metricErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: stage === 'prod' ? 10 : 5,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Lambda function error rate is too high',
      actionsEnabled: true,
    });
    errorRateAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: alertTopic.topicArn }),
    });

    // Lambda Duration Alarm
    const durationAlarm = new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
      metric: authFunction.metricDuration({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5000, // 5 seconds
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Lambda function duration is too high',
      actionsEnabled: true,
    });
    durationAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: alertTopic.topicArn }),
    });

    // Lambda Throttle Alarm
    const throttleAlarm = new cloudwatch.Alarm(this, 'LambdaThrottleAlarm', {
      metric: authFunction.metricThrottles({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Lambda function is being throttled',
      actionsEnabled: true,
    });
    throttleAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: alertTopic.topicArn }),
    });

    // API Gateway 5XX Error Alarm
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxErrorAlarm', {
      metric: api.metricServerError({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: stage === 'prod' ? 20 : 10,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway 5XX error rate is too high',
      actionsEnabled: true,
    });
    api5xxAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: alertTopic.topicArn }),
    });

    // Database CPU Utilization Alarm
    const dbCpuAlarm = new cloudwatch.Alarm(this, 'DatabaseCpuAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'ServerlessDatabaseCapacity',
        dimensionsMap: {
          DBClusterIdentifier: dbCluster.clusterIdentifier,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: stage === 'prod' ? 12 : 3, // ACU threshold
      evaluationPeriods: 3,
      datapointsToAlarm: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Database capacity is consistently high',
      actionsEnabled: true,
    });
    dbCpuAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: alertTopic.topicArn }),
    });

    // ======================
    // Outputs
    // ======================
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Authentication API URL',
      exportName: `U2AuthApiUrl-${stage}`,
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: dbCluster.clusterEndpoint.hostname,
      description: 'Aurora cluster endpoint',
      exportName: `U2AuthDbEndpoint-${stage}`,
    });

    new cdk.CfnOutput(this, 'DatabasePort', {
      value: dbCluster.clusterEndpoint.port.toString(),
      description: 'Aurora cluster port',
      exportName: `U2AuthDbPort-${stage}`,
    });

    new cdk.CfnOutput(this, 'DatabaseCredentialsSecret', {
      value: dbCredentials.secretArn,
      description: 'Database credentials secret ARN',
      exportName: `U2AuthDbCredsSecret-${stage}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: authFunction.functionArn,
      description: 'Lambda function ARN',
      exportName: `U2AuthLambdaArn-${stage}`,
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'SNS alert topic ARN',
      exportName: `U2AuthAlertTopic-${stage}`,
    });
  }
}