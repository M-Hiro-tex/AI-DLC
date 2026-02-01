#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}U2 Authentication - Database Migration Script${NC}"
echo -e "${GREEN}==============================================${NC}"
echo ""

# Get stage from argument or environment
STAGE=${1:-${STAGE:-dev}}

echo -e "${YELLOW}Migration Configuration:${NC}"
echo -e "  Stage: ${BLUE}${STAGE}${NC}"
echo ""

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Invalid stage '${STAGE}'. Must be dev, staging, or prod.${NC}"
    exit 1
fi

# Warning for production
if [ "$STAGE" = "prod" ]; then
    echo -e "${RED}⚠️  WARNING: You are migrating PRODUCTION database${NC}"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${YELLOW}Migration cancelled.${NC}"
        exit 0
    fi
fi

# Get database endpoint and credentials from CloudFormation
echo -e "${YELLOW}Retrieving database connection information...${NC}"

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name U2AuthenticationStack-${STAGE} \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text)

DB_PORT=$(aws cloudformation describe-stacks \
    --stack-name U2AuthenticationStack-${STAGE} \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabasePort`].OutputValue' \
    --output text)

DB_CREDS_SECRET=$(aws cloudformation describe-stacks \
    --stack-name U2AuthenticationStack-${STAGE} \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseCredentialsSecret`].OutputValue' \
    --output text)

if [ -z "$DB_ENDPOINT" ] || [ -z "$DB_CREDS_SECRET" ]; then
    echo -e "${RED}Error: Could not retrieve database information from CloudFormation.${NC}"
    echo -e "${YELLOW}Make sure the stack U2AuthenticationStack-${STAGE} is deployed.${NC}"
    exit 1
fi

echo -e "  Endpoint: ${BLUE}${DB_ENDPOINT}${NC}"
echo -e "  Port: ${BLUE}${DB_PORT}${NC}"
echo ""

# Get database credentials from Secrets Manager
echo -e "${YELLOW}Retrieving database credentials from Secrets Manager...${NC}"
DB_CREDS=$(aws secretsmanager get-secret-value \
    --secret-id $DB_CREDS_SECRET \
    --query SecretString \
    --output text)

DB_USERNAME=$(echo $DB_CREDS | jq -r '.username')
DB_PASSWORD=$(echo $DB_CREDS | jq -r '.password')
DB_NAME="authentication"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql command not found.${NC}"
    echo -e "${YELLOW}Please install PostgreSQL client:${NC}"
    echo -e "  macOS: ${BLUE}brew install postgresql${NC}"
    echo -e "  Ubuntu: ${BLUE}sudo apt-get install postgresql-client${NC}"
    echo -e "  CentOS: ${BLUE}sudo yum install postgresql${NC}"
    exit 1
fi

# Set PostgreSQL environment variables
export PGHOST=$DB_ENDPOINT
export PGPORT=$DB_PORT
export PGUSER=$DB_USERNAME
export PGPASSWORD=$DB_PASSWORD
export PGDATABASE=$DB_NAME

# Test connection
echo -e "${YELLOW}Testing database connection...${NC}"
psql -c "SELECT version();" > /dev/null 2>&1 || {
    echo -e "${RED}Error: Could not connect to database.${NC}"
    echo -e "${YELLOW}Possible issues:${NC}"
    echo -e "  1. Security groups not allowing connection from your IP"
    echo -e "  2. Database not fully initialized"
    echo -e "  3. Incorrect credentials"
    echo ""
    echo -e "${YELLOW}To allow your IP:${NC}"
    echo -e "  ${BLUE}aws ec2 authorize-security-group-ingress \\${NC}"
    echo -e "  ${BLUE}  --group-id <SECURITY_GROUP_ID> \\${NC}"
    echo -e "  ${BLUE}  --protocol tcp \\${NC}"
    echo -e "  ${BLUE}  --port 5432 \\${NC}"
    echo -e "  ${BLUE}  --cidr $(curl -s ifconfig.me)/32${NC}"
    exit 1
}

echo -e "${GREEN}Database connection successful!${NC}"
echo ""

# Create migrations tracking table if it doesn't exist
echo -e "${YELLOW}Setting up migrations tracking...${NC}"
psql -c "CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);" > /dev/null

echo -e "${GREEN}Migrations tracking table ready${NC}"
echo ""

# Find migration files
MIGRATION_DIR="../src/db/migrations"
if [ ! -d "$MIGRATION_DIR" ]; then
    echo -e "${RED}Error: Migration directory not found: ${MIGRATION_DIR}${NC}"
    exit 1
fi

MIGRATION_FILES=$(ls -1 ${MIGRATION_DIR}/*.sql 2>/dev/null | sort)
if [ -z "$MIGRATION_FILES" ]; then
    echo -e "${YELLOW}No migration files found in ${MIGRATION_DIR}${NC}"
    exit 0
fi

echo -e "${YELLOW}Found migration files:${NC}"
for file in $MIGRATION_FILES; do
    echo -e "  - $(basename $file)"
done
echo ""

# Apply migrations
MIGRATIONS_APPLIED=0
MIGRATIONS_SKIPPED=0

for migration_file in $MIGRATION_FILES; do
    MIGRATION_NAME=$(basename $migration_file)
    
    # Check if already applied
    ALREADY_APPLIED=$(psql -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '${MIGRATION_NAME}';" | tr -d ' ')
    
    if [ "$ALREADY_APPLIED" -gt 0 ]; then
        echo -e "${BLUE}[SKIP]${NC} ${MIGRATION_NAME} (already applied)"
        MIGRATIONS_SKIPPED=$((MIGRATIONS_SKIPPED + 1))
        continue
    fi
    
    # Apply migration
    echo -e "${YELLOW}[APPLY]${NC} ${MIGRATION_NAME}"
    
    # Start transaction
    psql -c "BEGIN;" > /dev/null
    
    # Apply migration file
    psql -f $migration_file || {
        echo -e "${RED}Error applying migration: ${MIGRATION_NAME}${NC}"
        psql -c "ROLLBACK;" > /dev/null
        exit 1
    }
    
    # Record migration
    psql -c "INSERT INTO schema_migrations (version) VALUES ('${MIGRATION_NAME}');" > /dev/null
    
    # Commit transaction
    psql -c "COMMIT;" > /dev/null
    
    echo -e "${GREEN}[SUCCESS]${NC} ${MIGRATION_NAME}"
    MIGRATIONS_APPLIED=$((MIGRATIONS_APPLIED + 1))
done

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Migration Completed Successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  Migrations applied: ${GREEN}${MIGRATIONS_APPLIED}${NC}"
echo -e "  Migrations skipped: ${BLUE}${MIGRATIONS_SKIPPED}${NC}"
echo ""

# List all applied migrations
echo -e "${YELLOW}Applied migrations:${NC}"
psql -c "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at;"
echo ""
