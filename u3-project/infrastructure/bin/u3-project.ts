#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { U3ProjectStack } from '../lib/u3-project-stack';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || 'dev';

// Get JWT secret from context (REQUIRED)
const jwtSecret = app.node.tryGetContext('jwtSecret');
if (!jwtSecret) {
  throw new Error('jwtSecret context variable is required. Use: cdk deploy -c jwtSecret=your-secret');
}

// Get auth service URL from context (REQUIRED)
const authServiceUrl = app.node.tryGetContext('authServiceUrl');
if (!authServiceUrl) {
  throw new Error('authServiceUrl context variable is required. Use: cdk deploy -c authServiceUrl=https://...');
}

new U3ProjectStack(app, `U3ProjectStack-${environment}`, {
  environment: environment as 'dev' | 'staging' | 'prod',
  jwtSecret,
  authServiceUrl,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: `U3-Project Service Stack for ${environment} environment`,
  tags: {
    Environment: environment,
    Service: 'u3-project',
    ManagedBy: 'CDK',
  },
});