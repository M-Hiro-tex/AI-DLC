#!/bin/bash

# Deploy script for U3-Project service using AWS CDK
# Builds and deploys to specified environment

set -e

# Default to dev environment
ENVIRONMENT=${1:-dev}
JWT_SECRET=${2}
AUTH_SERVICE_URL=${3}

echo "🚀 Deploying U3-Project Service to $ENVIRONMENT..."

# Validate required parameters
if [ -z "$JWT_SECRET" ]; then
  echo "❌ Error: JWT_SECRET is required"
  echo "Usage: ./deploy.sh <environment> <jwt-secret> <auth-service-url>"
  echo "Example: ./deploy.sh dev my-secret-key https://auth.example.com"
  exit 1
fi

if [ -z "$AUTH_SERVICE_URL" ]; then
  echo "❌ Error: AUTH_SERVICE_URL is required"
  echo "Usage: ./deploy.sh <environment> <jwt-secret> <auth-service-url>"
  echo "Example: ./deploy.sh dev my-secret-key https://auth.example.com"
  exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.."

# Build the application
echo "📦 Building application..."
./scripts/build.sh

# Navigate to infrastructure directory
cd infrastructure

# Install CDK dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing CDK dependencies..."
  npm install
fi

# Bootstrap CDK (if not already bootstrapped)
echo "🔧 Checking CDK bootstrap..."
cdk bootstrap || true

# Deploy stack
echo "☁️  Deploying to AWS..."
cdk deploy \
  -c environment=$ENVIRONMENT \
  -c jwtSecret=$JWT_SECRET \
  -c authServiceUrl=$AUTH_SERVICE_URL \
  --require-approval never

echo "✅ Deployment complete!"
echo ""
echo "📋 Stack outputs:"
cdk output

echo ""
echo "💡 To test the API:"
echo "curl -H 'Authorization: Bearer <token>' https://your-api-endpoint/api/v1/health"