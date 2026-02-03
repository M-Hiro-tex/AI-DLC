/**
 * Common Validation Utilities
 * 
 * Reusable validation functions and helpers that complement Zod schemas.
 */

/**
 * Validate UUID v4 format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date format (ISO 8601)
 */
export function isValidISODate(date: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoDateRegex.test(date)) {
    return false;
  }
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

/**
 * Validate date is in the past
 */
export function isDateInPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
}

/**
 * Validate date is in the future
 */
export function isDateInFuture(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
}

/**
 * Sanitize string input (trim and remove extra whitespace)
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Validate string length
 */
export function isValidLength(
  input: string,
  min: number,
  max: number
): boolean {
  const length = input.length;
  return length >= min && length <= max;
}

/**
 * Validate array length
 */
export function isValidArrayLength<T>(
  array: T[],
  min: number,
  max: number
): boolean {
  const length = array.length;
  return length >= min && length <= max;
}

/**
 * Validate number is within range
 */
export function isInRange(
  value: number,
  min: number,
  max: number
): boolean {
  return value >= min && value <= max;
}

/**
 * Validate percentage (0-100)
 */
export function isValidPercentage(value: number): boolean {
  return isInRange(value, 0, 100);
}

/**
 * Validate project status transition
 */
export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const validTransitions: Record<string, string[]> = {
    'Draft': ['Active', 'Draft'],
    'Active': ['Completed', 'Active'],
    'Completed': ['Completed']
  };

  const allowedStatuses = validTransitions[currentStatus];
  return allowedStatuses ? allowedStatuses.includes(newStatus) : false;
}

/**
 * Validate tag format (alphanumeric, hyphens, underscores)
 */
export function isValidTag(tag: string): boolean {
  const tagRegex = /^[a-zA-Z0-9_-]+$/;
  return tagRegex.test(tag) && isValidLength(tag, 1, 50);
}

/**
 * Validate array of tags
 */
export function areValidTags(tags: string[]): boolean {
  return tags.every(tag => isValidTag(tag)) && isValidArrayLength(tags, 0, 20);
}

/**
 * Sanitize tags (remove duplicates, normalize)
 */
export function sanitizeTags(tags: string[]): string[] {
  return Array.from(new Set(
    tags
      .map(tag => sanitizeString(tag).toLowerCase())
      .filter(tag => tag.length > 0)
  ));
}

/**
 * Validate user ID format (assuming UUID)
 */
export function isValidUserId(userId: string): boolean {
  return isValidUUID(userId);
}

/**
 * Validate project ID format (assuming UUID)
 */
export function isValidProjectId(projectId: string): boolean {
  return isValidUUID(projectId);
}

/**
 * Validate pagination parameters
 */
export function isValidPagination(
  page: number,
  pageSize: number
): { valid: boolean; error?: string } {
  if (page < 1) {
    return { valid: false, error: 'Page must be >= 1' };
  }
  if (pageSize < 1 || pageSize > 100) {
    return { valid: false, error: 'Page size must be between 1 and 100' };
  }
  return { valid: true };
}

/**
 * Validate sort parameters
 */
export function isValidSort(
  sortBy: string,
  allowedFields: string[]
): boolean {
  return allowedFields.includes(sortBy);
}

/**
 * Validate sort order
 */
export function isValidSortOrder(order: string): order is 'asc' | 'desc' {
  return order === 'asc' || order === 'desc';
}

/**
 * Validate shared user list
 */
export function areValidSharedUsers(userIds: string[]): boolean {
  return (
    userIds.every(id => isValidUserId(id)) &&
    isValidArrayLength(userIds, 1, 50) &&
    new Set(userIds).size === userIds.length // No duplicates
  );
}

/**
 * Validate JWT token format (basic check)
 */
export function isValidJWTFormat(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

/**
 * Validate hex color code
 */
export function isValidHexColor(color: string): boolean {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
}

/**
 * Validate file size (in bytes)
 */
export function isValidFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * Validate MIME type
 */
export function isValidMimeType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Create validation error message
 */
export function createValidationMessage(
  field: string,
  constraint: string
): string {
  return `${field} ${constraint}`;
}

/**
 * Validate and sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove special characters that could cause issues
  return query
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 200); // Limit length
}

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Validate object has required fields
 */
export function hasRequiredFields<T extends object>(
  obj: T,
  requiredFields: (keyof T)[]
): boolean {
  return requiredFields.every(field => !isEmpty(obj[field]));
}