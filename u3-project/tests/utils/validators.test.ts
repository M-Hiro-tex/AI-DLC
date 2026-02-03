import {
  isValidUUID,
  isValidEmail,
  isValidUrl,
  isValidISODate,
  isDateInPast,
  isDateInFuture,
  sanitizeString,
  isValidLength,
  isValidArrayLength,
  isInRange,
  isValidPercentage,
  isValidStatusTransition,
  isValidTag,
  areValidTags,
  sanitizeTags,
  isValidPagination,
  isValidSort,
  isValidSortOrder,
  areValidSharedUsers,
  isValidJWTFormat,
  isEmpty,
  hasRequiredFields
} from '../../src/utils/validators';

describe('Validators', () => {
  describe('isValidUUID', () => {
    it('should validate correct UUID v4', () => {
      expect(isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
    });

    it('should reject invalid UUID', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(false); // Not v4
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should reject invalid URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
    });
  });

  describe('isValidISODate', () => {
    it('should validate ISO 8601 date', () => {
      expect(isValidISODate('2024-01-15T10:30:00.000Z')).toBe(true);
    });

    it('should reject invalid date', () => {
      expect(isValidISODate('not-a-date')).toBe(false);
    });
  });

  describe('isDateInPast', () => {
    it('should return true for past date', () => {
      expect(isDateInPast('2020-01-01T00:00:00Z')).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(isDateInPast(futureDate)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should trim and remove extra whitespace', () => {
      expect(sanitizeString('  hello   world  ')).toBe('hello world');
    });
  });

  describe('isValidLength', () => {
    it('should validate string length', () => {
      expect(isValidLength('test', 1, 10)).toBe(true);
      expect(isValidLength('test', 5, 10)).toBe(false);
    });
  });

  describe('isValidArrayLength', () => {
    it('should validate array length', () => {
      expect(isValidArrayLength([1, 2, 3], 1, 5)).toBe(true);
      expect(isValidArrayLength([1, 2, 3], 5, 10)).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('should validate number in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true);
      expect(isInRange(15, 1, 10)).toBe(false);
    });
  });

  describe('isValidPercentage', () => {
    it('should validate percentage', () => {
      expect(isValidPercentage(50)).toBe(true);
      expect(isValidPercentage(150)).toBe(false);
    });
  });

  describe('isValidStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(isValidStatusTransition('Draft', 'Active')).toBe(true);
      expect(isValidStatusTransition('Active', 'Completed')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(isValidStatusTransition('Draft', 'Completed')).toBe(false);
      expect(isValidStatusTransition('Completed', 'Draft')).toBe(false);
    });
  });

  describe('isValidTag', () => {
    it('should validate correct tag', () => {
      expect(isValidTag('my-tag_123')).toBe(true);
    });

    it('should reject invalid tag', () => {
      expect(isValidTag('invalid tag!')).toBe(false);
      expect(isValidTag('')).toBe(false);
    });
  });

  describe('areValidTags', () => {
    it('should validate array of tags', () => {
      expect(areValidTags(['tag1', 'tag2'])).toBe(true);
    });

    it('should reject array with invalid tags', () => {
      expect(areValidTags(['valid', 'invalid tag!'])).toBe(false);
    });
  });

  describe('sanitizeTags', () => {
    it('should sanitize and deduplicate tags', () => {
      const result = sanitizeTags(['Tag1', 'tag1', '  Tag2  ', '']);
      expect(result).toEqual(['tag1', 'tag2']);
    });
  });

  describe('isValidPagination', () => {
    it('should validate correct pagination', () => {
      const result = isValidPagination(1, 20);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid page', () => {
      const result = isValidPagination(0, 20);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Page must be >= 1');
    });

    it('should reject invalid page size', () => {
      const result = isValidPagination(1, 200);
      expect(result.valid).toBe(false);
    });
  });

  describe('isValidSort', () => {
    it('should validate sort field', () => {
      expect(isValidSort('name', ['name', 'date'])).toBe(true);
      expect(isValidSort('invalid', ['name', 'date'])).toBe(false);
    });
  });

  describe('isValidSortOrder', () => {
    it('should validate sort order', () => {
      expect(isValidSortOrder('asc')).toBe(true);
      expect(isValidSortOrder('desc')).toBe(true);
      expect(isValidSortOrder('invalid')).toBe(false);
    });
  });

  describe('areValidSharedUsers', () => {
    it('should validate array of user IDs', () => {
      const userIds = [
        '123e4567-e89b-42d3-a456-426614174000',
        '123e4567-e89b-42d3-a456-426614174001'
      ];
      expect(areValidSharedUsers(userIds)).toBe(true);
    });

    it('should reject array with duplicate IDs', () => {
      const userIds = [
        '123e4567-e89b-42d3-a456-426614174000',
        '123e4567-e89b-42d3-a456-426614174000'
      ];
      expect(areValidSharedUsers(userIds)).toBe(false);
    });
  });

  describe('isValidJWTFormat', () => {
    it('should validate JWT format', () => {
      expect(isValidJWTFormat('header.payload.signature')).toBe(true);
    });

    it('should reject invalid JWT format', () => {
      expect(isValidJWTFormat('invalid')).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('should detect empty values', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('  ')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
    });

    it('should detect non-empty values', () => {
      expect(isEmpty('test')).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty({ key: 'value' })).toBe(false);
    });
  });

  describe('hasRequiredFields', () => {
    it('should validate required fields', () => {
      const obj = { name: 'test', email: 'test@example.com' };
      expect(hasRequiredFields(obj, ['name', 'email'])).toBe(true);
    });

    it('should detect missing required fields', () => {
      const obj = { name: 'test' };
      expect(hasRequiredFields(obj, ['name', 'email'])).toBe(false);
    });
  });
});