#!/bin/bash

# Seed project templates into DynamoDB
# Run this after deploying the infrastructure

set -e

TABLE_NAME=${1}
REGION=${2:-us-east-1}

if [ -z "$TABLE_NAME" ]; then
  echo "❌ Error: TABLE_NAME is required"
  echo "Usage: ./seed-templates.sh <table-name> [region]"
  echo "Example: ./seed-templates.sh ProjectDomain-dev us-east-1"
  exit 1
fi

echo "🌱 Seeding project templates into $TABLE_NAME..."

# Template 1: Basic Web Project
aws dynamodb put-item \
  --table-name $TABLE_NAME \
  --region $REGION \
  --item '{
    "PK": {"S": "TEMPLATE#basic-web"},
    "SK": {"S": "METADATA"},
    "GSI2PK": {"S": "TEMPLATE"},
    "GSI2SK": {"S": "web#basic-web"},
    "EntityType": {"S": "Template"},
    "id": {"S": "basic-web"},
    "name": {"S": "Basic Web Project"},
    "description": {"S": "Simple HTML/CSS/JavaScript project for beginners"},
    "category": {"S": "web"},
    "difficulty": {"S": "beginner"},
    "estimatedHours": {"N": "10"},
    "tags": {"L": [{"S": "html"}, {"S": "css"}, {"S": "javascript"}]},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"}
  }'

echo "✅ Template 1: Basic Web Project"

# Template 2: React Todo App
aws dynamodb put-item \
  --table-name $TABLE_NAME \
  --region $REGION \
  --item '{
    "PK": {"S": "TEMPLATE#react-todo"},
    "SK": {"S": "METADATA"},
    "GSI2PK": {"S": "TEMPLATE"},
    "GSI2SK": {"S": "web#react-todo"},
    "EntityType": {"S": "Template"},
    "id": {"S": "react-todo"},
    "name": {"S": "React Todo App"},
    "description": {"S": "Todo application with React and TypeScript"},
    "category": {"S": "web"},
    "difficulty": {"S": "intermediate"},
    "estimatedHours": {"N": "20"},
    "tags": {"L": [{"S": "react"}, {"S": "typescript"}, {"S": "hooks"}]},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"}
  }'

echo "✅ Template 2: React Todo App"

# Template 3: Node.js REST API
aws dynamodb put-item \
  --table-name $TABLE_NAME \
  --region $REGION \
  --item '{
    "PK": {"S": "TEMPLATE#nodejs-api"},
    "SK": {"S": "METADATA"},
    "GSI2PK": {"S": "TEMPLATE"},
    "GSI2SK": {"S": "backend#nodejs-api"},
    "EntityType": {"S": "Template"},
    "id": {"S": "nodejs-api"},
    "name": {"S": "Node.js REST API"},
    "description": {"S": "RESTful API with Express and MongoDB"},
    "category": {"S": "backend"},
    "difficulty": {"S": "intermediate"},
    "estimatedHours": {"N": "25"},
    "tags": {"L": [{"S": "nodejs"}, {"S": "express"}, {"S": "mongodb"}, {"S": "rest"}]},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"}
  }'

echo "✅ Template 3: Node.js REST API"

# Template 4: Python Data Analysis
aws dynamodb put-item \
  --table-name $TABLE_NAME \
  --region $REGION \
  --item '{
    "PK": {"S": "TEMPLATE#python-data"},
    "SK": {"S": "METADATA"},
    "GSI2PK": {"S": "TEMPLATE"},
    "GSI2SK": {"S": "data#python-data"},
    "EntityType": {"S": "Template"},
    "id": {"S": "python-data"},
    "name": {"S": "Python Data Analysis"},
    "description": {"S": "Data analysis project with pandas and matplotlib"},
    "category": {"S": "data"},
    "difficulty": {"S": "intermediate"},
    "estimatedHours": {"N": "15"},
    "tags": {"L": [{"S": "python"}, {"S": "pandas"}, {"S": "matplotlib"}, {"S": "jupyter"}]},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"}
  }'

echo "✅ Template 4: Python Data Analysis"

# Template 5: Mobile App with React Native
aws dynamodb put-item \
  --table-name $TABLE_NAME \
  --region $REGION \
  --item '{
    "PK": {"S": "TEMPLATE#react-native-app"},
    "SK": {"S": "METADATA"},
    "GSI2PK": {"S": "TEMPLATE"},
    "GSI2SK": {"S": "mobile#react-native-app"},
    "EntityType": {"S": "Template"},
    "id": {"S": "react-native-app"},
    "name": {"S": "Mobile App with React Native"},
    "description": {"S": "Cross-platform mobile app with React Native"},
    "category": {"S": "mobile"},
    "difficulty": {"S": "advanced"},
    "estimatedHours": {"N": "40"},
    "tags": {"L": [{"S": "react-native"}, {"S": "mobile"}, {"S": "ios"}, {"S": "android"}]},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"}
  }'

echo "✅ Template 5: Mobile App with React Native"

echo ""
echo "✅ Seeding complete! 5 templates added to $TABLE_NAME"
echo ""
echo "💡 To verify:"
echo "aws dynamodb scan --table-name $TABLE_NAME --region $REGION --filter-expression 'EntityType = :type' --expression-attribute-values '{\":type\":{\"S\":\"Template\"}}'"