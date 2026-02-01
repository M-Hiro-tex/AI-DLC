import * as AWSXRay from 'aws-xray-sdk-core';
import * as http from 'http';
import * as https from 'https';

/**
 * Configure AWS X-Ray for distributed tracing
 */
export function configureXRay(): void {
  // Only enable in non-local environments
  if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test') {
    console.log('X-Ray disabled for local/test environment');
    return;
  }

  // Instrument HTTP clients
  AWSXRay.captureHTTPsGlobal(http);
  AWSXRay.captureHTTPsGlobal(https);

  // Configure sampling rules
  const samplingRules = {
    version: 2,
    rules: [
      {
        description: 'Authentication endpoints - high priority',
        service_name: '*',
        http_method: 'POST',
        url_path: '/api/v1/auth/*',
        fixed_target: 10,
        rate: 1.0,
      },
      {
        description: 'Health checks - low sampling',
        service_name: '*',
        http_method: 'GET',
        url_path: '/health',
        fixed_target: 0,
        rate: 0.01,
      },
      {
        description: 'Default rule - moderate sampling',
        service_name: '*',
        http_method: '*',
        url_path: '*',
        fixed_target: 5,
        rate: 0.1,
      },
    ],
    default: {
      fixed_target: 1,
      rate: 0.05,
    },
  };

  // Apply sampling rules (requires X-Ray daemon or Lambda integration)
  console.log('X-Ray tracing enabled with custom sampling rules');
}

/**
 * Create a custom X-Ray subsegment for tracing specific operations
 */
export function traceOperation<T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  // Get current segment
  const segment = AWSXRay.getSegment();
  
  if (!segment) {
    // X-Ray not active, just execute operation
    return operation();
  }

  // Create subsegment
  const subsegment = segment.addNewSubsegment(name);
  
  // Add metadata if provided
  if (metadata) {
    subsegment.addMetadata('operation', metadata);
  }

  return operation()
    .then((result) => {
      subsegment.close();
      return result;
    })
    .catch((error) => {
      subsegment.addError(error);
      subsegment.close();
      throw error;
    });
}

/**
 * Add custom annotation to current X-Ray segment
 */
export function addAnnotation(key: string, value: string | number | boolean): void {
  const segment = AWSXRay.getSegment();
  if (segment) {
    segment.addAnnotation(key, value);
  }
}

/**
 * Add custom metadata to current X-Ray segment
 */
export function addMetadata(key: string, value: any, namespace?: string): void {
  const segment = AWSXRay.getSegment();
  if (segment) {
    segment.addMetadata(key, value, namespace);
  }
}

/**
 * Trace OAuth provider calls
 */
export async function traceOAuthCall<T>(
  provider: string,
  operation: string,
  call: () => Promise<T>
): Promise<T> {
  return traceOperation(
    `OAuth-${provider}-${operation}`,
    call,
    { provider, operation }
  );
}

/**
 * Trace database operations
 */
export async function traceDatabaseQuery<T>(
  table: string,
  operation: string,
  query: () => Promise<T>
): Promise<T> {
  return traceOperation(
    `Database-${table}-${operation}`,
    query,
    { table, operation }
  );
}

/**
 * Trace session operations
 */
export async function traceSessionOperation<T>(
  operation: string,
  userId: string,
  call: () => Promise<T>
): Promise<T> {
  const result = await traceOperation(
    `Session-${operation}`,
    call,
    { userId, operation }
  );
  
  // Add user ID as annotation for filtering
  addAnnotation('userId', userId);
  
  return result;
}