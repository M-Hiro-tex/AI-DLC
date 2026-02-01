#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}===================================${NC}"
echo -e "${GREEN}U2 Authentication - Deploy Script${NC}"
echo -e "${GREEN}===================================${NC}"
echo ""

# Get stage from argument or environment
STAGE=${1:-${STAGE:-dev}}
ALERT_EMAIL=${2:-${ALERT_EMAIL}}

echo -e "${YELLOW}Deployment Configuration:${NC}"
echo -e "  Stage: ${BLUE}${STAGE}${NC}"
if [ -n "$ALERT_EMAIL" ]; then
    echo -e "  Alert Email: ${BLUE}${ALERT_EMAIL}${NC}"
fi
echo ""

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Invalid stage '${STAGE}'. Must be dev, staging, or prod.${NC}"
    exit 1
fi

# Confirm production deployment
if [ "$STAGE" = "prod" ]; then
    echo -e "${RED}⚠️  WARNING: You are deploying to PRODUCTION${NC}"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${YELLOW}Deployment cancelled.${NC}"
        exit 0
    fi
fi

# Step 1: Build application
echo -e "${YELLOW}Step 1/5: Building application...${NC}"
./scripts/build.sh $STAGE

# Step 2: Build and deploy infrastructure
echo -e "${YELLOW}Step 2/5: Deploying infrastructure with CDK...${NC}"
cd infrastructure

# Install CDK dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing CDK dependencies...${NC}"
    npm install
fi

# Build CDK TypeScript
npm run build

# Deploy with CDK
CDK_COMMAND="cdk deploy --context stage=${STAGE} --require-approval never"
if [ -n "$ALERT_EMAIL" ]; then
    CDK_COMMAND="$CDK_COMMAND --context alertEmail=${ALERT_EMAIL}"
fi

echo -e "${YELLOW}Running: ${CDK_COMMAND}${NC}"
eval $CDK_COMMAND

# Get stack outputs
echo -e "${YELLOW}Retrieving stack outputs...${NC}"
API_URL=$(aws cloudformation describe-stacks \
    --stack-name U2AuthenticationStack-${STAGE} \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text)

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name U2AuthenticationStack-${STAGE} \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text)

cd ..

# Step 3: Run database migrations
echo -e "${YELLOW}Step 3/5: Running database migrations...${NC}"
./scripts/migrate-db.sh $STAGE

# Step 4: Run smoke tests
echo -e "${YELLOW}Step 4/5: Running smoke tests...${NC}"
if [ -d "tests/smoke" ]; then
    export API_URL=$API_URL
    npm run test:smoke || {
        echo -e "${RED}Smoke tests failed!${NC}"
        echo -e "${YELLOW}Deployment completed but verification failed.${NC}"
        echo -e "${YELLOW}Consider rolling back: ./scripts/rollback.sh ${STAGE}${NC}"
        exit 1
    }
else
    echo -e "${YELLOW}No smoke tests found, skipping...${NC}"
fi

# Step 5: Output deployment information
echo ""
echo -e "${GREEN}===================================${NC}"
echo -e "${GREEN}Deployment Completed Successfully!${NC}"
echo -e "${GREEN}===================================${NC}"
echo ""
echo -e "${YELLOW}Deployment Details:${NC}"
echo -e "  Stage: ${BLUE}${STAGE}${NC}"
echo -e "  API URL: ${BLUE}${API_URL}${NC}"
echo -e "  Database: ${BLUE}${DB_ENDPOINT}${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Update OAuth secrets if not already set:"
echo -e "     ${BLUE}aws secretsmanager put-secret-value --secret-id /${STAGE}/u2-authentication/oauth --secret-string '{...}'${NC}"
echo -e "  2. Test the API:"
echo -e "     ${BLUE}curl ${API_URL}/health${NC}"
echo -e "  3. Monitor logs:"
echo -e "     ${BLUE}aws logs tail /aws/lambda/U2AuthenticationStack-${STAGE}-AuthFunction --follow${NC}"
echo ""

# Save deployment metadata
DEPLOYMENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > deployment-${STAGE}.json <<EOF
{
  "stage": "${STAGE}",
  "deploymentTime": "${DEPLOYMENT_TIME}",
  "apiUrl": "${API_URL}",
  "databaseEndpoint": "${DB_ENDPOINT}",
  "version": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
}
EOF

echo -e "${GREEN}Deployment metadata saved to deployment-${STAGE}.json${NC}"
echo ""