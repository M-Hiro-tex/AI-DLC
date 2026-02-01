#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}U2 Authentication - Build Script${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from u2-authentication directory.${NC}"
    exit 1
fi

# Get stage from environment or argument
STAGE=${1:-${STAGE:-dev}}
echo -e "${YELLOW}Building for stage: ${STAGE}${NC}"
echo ""

# Clean previous build
echo -e "${YELLOW}Cleaning previous build...${NC}"
rm -rf dist/
rm -rf node_modules/

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm ci --production=false

# Run linter
echo -e "${YELLOW}Running linter...${NC}"
npm run lint || {
    echo -e "${RED}Linting failed. Fix errors before deploying.${NC}"
    exit 1
}

# Run type check
echo -e "${YELLOW}Running type check...${NC}"
npm run type-check || {
    echo -e "${RED}Type checking failed. Fix errors before deploying.${NC}"
    exit 1
}

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm test || {
    echo -e "${RED}Tests failed. Fix errors before deploying.${NC}"
    exit 1
}

# Build TypeScript
echo -e "${YELLOW}Compiling TypeScript...${NC}"
npm run build

# Verify build output
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo -e "${RED}Error: Build failed - dist directory is empty${NC}"
    exit 1
fi

# Install production dependencies only
echo -e "${YELLOW}Installing production dependencies...${NC}"
npm ci --production

# Create deployment package structure
echo -e "${YELLOW}Creating deployment package...${NC}"
mkdir -p dist/node_modules
cp -r node_modules/* dist/node_modules/

# Calculate package size
PACKAGE_SIZE=$(du -sh dist | cut -f1)
echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${GREEN}Package size: ${PACKAGE_SIZE}${NC}"
echo ""

# Check package size (Lambda limit is 250MB uncompressed)
PACKAGE_SIZE_MB=$(du -sm dist | cut -f1)
if [ $PACKAGE_SIZE_MB -gt 200 ]; then
    echo -e "${YELLOW}Warning: Package size is large (${PACKAGE_SIZE_MB}MB). Consider using Lambda layers or container images.${NC}"
fi

echo -e "${GREEN}Build artifacts ready in dist/ directory${NC}"
echo ""