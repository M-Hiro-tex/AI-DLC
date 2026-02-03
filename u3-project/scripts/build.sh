#!/bin/bash

# Build script for U3-Project service
# Compiles TypeScript and prepares for deployment

set -e

echo "🔨 Building U3-Project Service..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Compile TypeScript
echo "📝 Compiling TypeScript..."
npm run build

# Copy package files for Lambda
echo "📋 Copying package files..."
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || true

# Install production dependencies in dist
echo "📦 Installing production dependencies..."
cd dist
npm install --production
cd ..

echo "✅ Build complete! Output in dist/"