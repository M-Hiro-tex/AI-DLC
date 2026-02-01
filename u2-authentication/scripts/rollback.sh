#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}U2 Authentication - Rollback Script${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Get stage from argument or environment
STAGE=${1:-${STAGE:-dev}}

echo -e "${YELLOW}Rollback Configuration:${NC}"
echo -e "  Stage: ${BLUE}${STAGE}${NC}"
echo ""

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Invalid stage '${STAGE}'. Must be dev, staging, or prod.${NC}"
    exit 1
fi

# Warning for production
if [ "$STAGE" = "prod" ]; then
    echo -e "${RED}⚠️  WARNING: You are rolling back PRODUCTION${NC}"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${YELLOW}Rollback cancelled.${NC}"
        exit 0
    fi
fi

# Check if previous deployment metadata exists
PREV_DEPLOYMENT="deployment-${STAGE}-prev.json"
if [ ! -f "$PREV_DEPLOYMENT" ]; then
    echo -e "${RED}Error: No previous deployment metadata found.${NC}"
    echo -e "${YELLOW}Cannot perform automatic rollback without deployment history.${NC}"
    echo -e "${YELLOW}Manual rollback options:${NC}"
    echo -e "  1. Redeploy from a known good git commit"
    echo -e "  2. Use CDK to rollback: cd infrastructure && cdk deploy --context stage=${STAGE}${NC}"
    exit 1
fi

# Load previous deployment metadata
echo -e "${YELLOW}Loading previous deployment metadata...${NC}"
PREV_VERSION=$(jq -r '.version' $PREV_DEPLOYMENT)
PREV_TIME=$(jq -r '.deploymentTime' $PREV_DEPLOYMENT)

echo -e "${YELLOW}Previous deployment:${NC}"
echo -e "  Version: ${BLUE}${PREV_VERSION}${NC}"
echo -e "  Time: ${BLUE}${PREV_TIME}${NC}"
echo ""

read -p "Rollback to this version? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Rollback cancelled.${NC}"
    exit 0
fi

# Step 1: Checkout previous version
echo -e "${YELLOW}Step 1/4: Checking out previous version...${NC}"
if [ "$PREV_VERSION" != "unknown" ]; then
    git checkout $PREV_VERSION || {
        echo -e "${RED}Failed to checkout version ${PREV_VERSION}${NC}"
        echo -e "${YELLOW}Proceeding with rollback using latest code...${NC}"
    }
else
    echo -e "${YELLOW}Version unknown, using current code...${NC}"
fi

# Step 2: Build application
echo -e "${YELLOW}Step 2/4: Building application...${NC}"
./scripts/build.sh $STAGE

# Step 3: Deploy infrastructure
echo -e "${YELLOW}Step 3/4: Deploying infrastructure...${NC}"
cd infrastructure
npm run build
cdk deploy --context stage=${STAGE} --require-approval never
cd ..

# Step 4: Verify rollback
echo -e "${YELLOW}Step 4/4: Verifying rollback...${NC}"

# Get current API URL
API_URL=$(aws cloudformation describe-stacks \
    --stack-name U2AuthenticationStack-${STAGE} \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text)

# Test health endpoint
echo -e "${YELLOW}Testing health endpoint...${NC}"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${API_URL}/health)

if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}Health check passed!${NC}"
else
    echo -e "${RED}Health check failed with status: ${HEALTH_STATUS}${NC}"
    echo -e "${YELLOW}Rollback may have issues. Check logs:${NC}"
    echo -e "  ${BLUE}aws logs tail /aws/lambda/U2AuthenticationStack-${STAGE}-AuthFunction --follow${NC}"
    exit 1
fi

# Success
echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Rollback Completed Successfully!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${YELLOW}Rollback Details:${NC}"
echo -e "  Stage: ${BLUE}${STAGE}${NC}"
echo -e "  Rolled back to: ${BLUE}${PREV_VERSION}${NC}"
echo -e "  API URL: ${BLUE}${API_URL}${NC}"
echo ""
echo -e "${YELLOW}Monitoring:${NC}"
echo -e "  Watch logs: ${BLUE}aws logs tail /aws/lambda/U2AuthenticationStack-${STAGE}-AuthFunction --follow${NC}"
echo -e "  Check metrics: ${BLUE}CloudWatch dashboard for stage ${STAGE}${NC}"
echo ""

# Return to previous branch if applicable
if [ "$PREV_VERSION" != "unknown" ] && [ -n "$(git branch --show-current)" ]; then
    git checkout - 2>/dev/null || true
fi