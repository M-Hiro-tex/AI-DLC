import serverless from 'serverless-http';
import { createApp } from './app';

/**
 * AWS Lambda Handler
 * 
 * Wraps the Express application using serverless-http for Lambda deployment.
 * This handler is invoked by API Gateway.
 */

const app = createApp();

// Export the Lambda handler
export const handler = serverless(app, {
  // Strip base path if using custom domain
  basePath: process.env.BASE_PATH || '',
  
  // Request/response processing options
  request(request: any, event: any, context: any) {
    // Add Lambda context to request
    request.lambda = {
      event,
      context,
      requestContext: event.requestContext
    };
  },
  
  response(response: any, event: any, context: any) {
    // Add custom headers
    response.headers = {
      ...response.headers,
      'X-Request-Id': event.requestContext?.requestId || '',
      'X-Function-Name': context.functionName || ''
    };
  }
});

// For local testing with Lambda-like environment
if (require.main === module) {
  const testEvent = {
    httpMethod: 'GET',
    path: '/api/v1/health',
    headers: {},
    requestContext: {
      requestId: 'local-test',
      identity: {
        sourceIp: '127.0.0.1'
      }
    }
  };

  handler(testEvent, {
    functionName: 'u3-project-local',
    awsRequestId: 'local-test-id'
  } as any, (error: any, result: any) => {
    if (error) {
      console.error('Lambda error:', error);
    } else {
      console.log('Lambda response:', JSON.stringify(result, null, 2));
    }
  });
}