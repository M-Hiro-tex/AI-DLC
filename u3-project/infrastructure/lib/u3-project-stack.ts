import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface U3ProjectStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
  jwtSecret: string;
  authServiceUrl: string;
}

export class U3ProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: U3ProjectStackProps) {
    super(scope, id, props);

    const { environment, jwtSecret, authServiceUrl } = props;

    // ======================
    // DynamoDB Table (Single-Table Design)
    // ======================
    const table = new dynamodb.Table(this, 'ProjectDomainTable', {
      tableName: `ProjectDomain-${environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod',
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      
      // Lifecycle for old data
      timeToLiveAttribute: 'TTL',
    });

    // GSI1: Owner Index (Query projects by owner)
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: Template Index (Query templates)
    table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ======================
    // Lambda Function
    // ======================
    const lambdaFunction = new lambda.Function(this, 'U3ProjectFunction', {
      functionName: `u3-project-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist')),
      memorySize: environment === 'prod' ? 512 : 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        APP_VERSION: '1.0.0',
        SERVICE_NAME: 'u3-project',
        AWS_REGION: this.region,
        DYNAMODB_TABLE_NAME: table.tableName,
        JWT_SECRET: jwtSecret,
        JWT_EXPIRES_IN: '24h',
        AUTH_SERVICE_URL: authServiceUrl,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
        ALLOWED_ORIGINS: '*', // Configure per environment
        RATE_LIMIT_MAX: '100',
        RATE_LIMIT_WINDOW_MS: '60000',
        DEFAULT_PAGE_SIZE: '20',
        MAX_PAGE_SIZE: '100',
      },
      logRetention: environment === 'prod'
        ? logs.RetentionDays.ONE_MONTH
        : logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE, // X-Ray tracing
    });

    // Grant DynamoDB permissions
    table.grantReadWriteData(lambdaFunction);

    // Grant CloudWatch Logs permissions (for Lambda Powertools)
    lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ['*'],
    }));

    // ======================
    // API Gateway
    // ======================
    const api = new apigateway.RestApi(this, 'U3ProjectApi', {
      restApiName: `u3-project-api-${environment}`,
      description: 'U3-Project Service API',
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        tracingEnabled: true,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // Configure per environment
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'Accept',
          'Origin',
        ],
        allowCredentials: true,
      },
    });

    // Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      proxy: true,
      allowTestInvoke: environment !== 'prod',
    });

    // API Gateway endpoints (catch-all for Express routes)
    api.root.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
    });

    // ======================
    // CloudWatch Alarms
    // ======================
    if (environment === 'prod') {
      // Lambda errors alarm
      new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
        alarmName: `u3-project-lambda-errors-${environment}`,
        metric: lambdaFunction.metricErrors(),
        threshold: 10,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      // Lambda throttles alarm
      new cloudwatch.Alarm(this, 'LambdaThrottlesAlarm', {
        alarmName: `u3-project-lambda-throttles-${environment}`,
        metric: lambdaFunction.metricThrottles(),
        threshold: 5,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      // API Gateway 4XX errors alarm
      new cloudwatch.Alarm(this, 'ApiGateway4xxAlarm', {
        alarmName: `u3-project-api-4xx-${environment}`,
        metric: api.metricClientError(),
        threshold: 100,
        evaluationPeriods: 5,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      // API Gateway 5XX errors alarm
      new cloudwatch.Alarm(this, 'ApiGateway5xxAlarm', {
        alarmName: `u3-project-api-5xx-${environment}`,
        metric: api.metricServerError(),
        threshold: 10,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      // DynamoDB throttles alarm
      new cloudwatch.Alarm(this, 'DynamoDBThrottlesAlarm', {
        alarmName: `u3-project-dynamodb-throttles-${environment}`,
        metric: table.metricUserErrors(),
        threshold: 10,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    }

    // ======================
    // Outputs
    // ======================
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
      exportName: `u3-project-api-endpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'DynamoDB table name',
      exportName: `u3-project-table-name-${environment}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: lambdaFunction.functionName,
      description: 'Lambda function name',
      exportName: `u3-project-function-name-${environment}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: lambdaFunction.functionArn,
      description: 'Lambda function ARN',
      exportName: `u3-project-function-arn-${environment}`,
    });
  }
}