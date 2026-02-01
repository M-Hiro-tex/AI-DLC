/**
 * AWS Lambda Handler
 * 
 * Wraps the Express application for AWS Lambda execution using serverless-http.
 * This allows the same Express app to run both as a traditional HTTP server
 * and as an AWS Lambda function.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import serverless from 'serverless-http';
import { createApp } from './app';
import { logger } from './utils/logger';

/**
 * Create serverless handler
 * 
 * The serverless-http library wraps the Express app and translates
 * API Gateway events into HTTP requests that Express can understand.
 */
const app = createApp();
const handler = serverless(app, {
  // Request options
  request: {
    // Keep the original URL path from API Gateway
    basePath: '/api/v1',
  },
});

/**
 * Lambda handler function
 * 
 * This is the entry point for AWS Lambda invocations.
 * API Gateway will invoke this function for each HTTP request.
 * 
 * @param event - API Gateway event containing HTTP request details
 * @param context - Lambda execution context
 * @returns Promise<APIGatewayProxyResult> - HTTP response to return to API Gateway
 */
export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // Log incoming request
    logger.info('Lambda invocation', {
      requestId: context.requestId,
      method: event.httpMethod,
      path: event.path,
      sourceIp: event.requestContext.identity.sourceIp,
    });

    // Set correlation ID from API Gateway request ID
    if (event.headers) {
      event.headers['X-Correlation-ID'] = event.headers['X-Correlation-ID'] || context.requestId;
    }

    // Invoke the serverless handler
    const response = await handler(event, context);

    // Log response
    logger.info('Lambda response', {
      requestId: context.requestId,
      statusCode: response.statusCode,
    });

    return response;
  } catch (error) {
    // Log error
    logger.error('Lambda handler error', {
      requestId: context.requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 500 error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': context.requestId,
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        requestId: context.requestId,
      }),
    };
  }
};

/**
 * Export handler for Lambda
 */
export const handler = lambdaHandler;

/**
 * Health check handler
 * 
 * Separate Lambda function for health checks that doesn't go through Express.
 * This is more efficient for simple health checks.
 */
export const healthCheck = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': context.requestId,
    },
    body: JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      version: process.env.APP_VERSION || 'unknown',
    }),
  };
};

/**
 * Warm-up handler
 * 
 * Handler for Lambda warm-up events to keep the function instance warm.
 * This helps reduce cold start latency.
 */
export const warmUp = async (
  event: any,
  context: Context
): Promise<any> => {
  logger.info('Warm-up invocation', { requestId: context.requestId });
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Lambda warmed up successfully',
      timestamp: new Date().toISOString(),
    }),
  };
};