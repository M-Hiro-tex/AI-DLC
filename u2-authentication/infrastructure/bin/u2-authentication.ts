#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { U2AuthenticationStack } from '../lib/u2-authentication-stack';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Deployment stage from context or environment
const stage = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';

new U2AuthenticationStack(app, `U2AuthenticationStack-${stage}`, {
  env,
  stage,
  description: `U2 Authentication Domain - ${stage} environment`,
  tags: {
    Environment: stage,
    Service: 'u2-authentication',
    ManagedBy: 'CDK',
  },
});