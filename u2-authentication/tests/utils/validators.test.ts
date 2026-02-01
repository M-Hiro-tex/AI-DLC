/**
 * Unit tests for validators utility
 */

import {
  isValidEmail,
  isValidDisplayName,
  isValidJwtFormat,
  isValidRefreshTokenFormat,
  isValidOAuthStateFormat,
  isValidUrl,
  sanitizeDisplayName,
  validateUserProfile,
} from '../../src/utils/validators';

describe('validators', () => {
  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.com')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('user_name@example-domain.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
      expect(isValidEmail('user..name@example.com')).toBe(false); // Consecutive dots
    });

    it('should reject emails exceeding max length', () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(isValidEmail(null as any)).toBe(false);
      expect(isValidEmail(undefined as any)).toBe(false);
      expect(isValidEmail(123 as any)).toBe(false);
    });
  });

  describe('isValidDisplayName', () => {
    it('should validate correct display names', () => {
      expect(isValidDisplayName('John Doe')).toBe(true);
      expect(isValidDisplayName('José García')).toBe(true);
      expect(isValidDisplayName('田中 太郎')).toBe(true);
      expect(isValidDisplayName("O'Connor")).toBe(true);
      expect(isValidDisplayName('User123')).toBe(true);
      expect(isValidDisplayName('Test-User')).toBe(true);
    });

    it('should reject display names with leading/trailing whitespace', () => {
      expect(isValidDisplayName(' John')).toBe(false);
      expect(isValidDisplayName('John ')).toBe(false);
      expect(isValidDisplayName(' John ')).toBe(false);
    });

    it('should reject display names outside length limits', () => {
      expect(isValidDisplayName('')).toBe(false);
      expect(isValidDisplayName('a'.repeat(101))).toBe(false);
    });

    it('should reject display names with invalid characters', () => {
      expect(isValidDisplayName('User@123')).toBe(false);
      expect(isValidDisplayName('User#123')).toBe(false);
      expect(isValidDisplayName('User<script>')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(isValidDisplayName(null as any)).toBe(false);
      expect(isValidDisplayName(undefined as any)).toBe(false);
      expect(isValidDisplayName(123 as any)).toBe(false);
    });
  });

  describe('isValidJwtFormat', () => {
    it('should validate correct JWT format', () => {
      const validJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(isValidJwtFormat(validJwt)).toBe(true);
    });

    it('should reject JWTs with incorrect number of parts', () => {
      expect(isValidJwtFormat('header.payload')).toBe(false);
      expect(isValidJwtFormat('header.payload.signature.extra')).toBe(false);
    });

    it('should reject JWTs with empty parts', () => {
      expect(isValidJwtFormat('.payload.signature')).toBe(false);
      expect(isValidJwtFormat('header..signature')).toBe(false);
      expect(isValidJwtFormat('header.payload.')).toBe(false);
    });

    it('should reject JWTs with invalid base64url characters', () => {
      expect(isValidJwtFormat('header+.payload.signature')).toBe(false);
      expect(isValidJwtFormat('header.payload/.signature')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(isValidJwtFormat(null as any)).toBe(false);
      expect(isValidJwtFormat(undefined as any)).toBe(false);
      expect(isValidJwtFormat(123 as any)).toBe(false);
    });
  });

  describe('isValidRefreshTokenFormat', () => {
    it('should validate correct refresh token format', () => {
      const validToken = 'a'.repeat(64); // 64 alphanumeric characters
      expect(isValidRefreshTokenFormat(validToken)).toBe(true);
    });

    it('should reject tokens outside length limits', () => {
      expect(isValidRefreshTokenFormat('a'.repeat(31))).toBe(false); // Too short
      expect(isValidRefreshTokenFormat('a'.repeat(129))).toBe(false); // Too long
    });

    it('should reject tokens with invalid characters', () => {
      expect(isValidRefreshTokenFormat('a'.repeat(32) + '-')).toBe(false);
      expect(isValidRefreshTokenFormat('a'.repeat(32) + '_')).toBe(false);
      expect(isValidRefreshTokenFormat('a'.repeat(32) + '+')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(isValidRefreshTokenFormat(null as any)).toBe(false);
      expect(isValidRefreshTokenFormat(undefined as any)).toBe(false);
    });
  });

  describe('isValidOAuthStateFormat', () => {
    it('should validate correct OAuth state format', () => {
      const validState = 'a'.repeat(32);
      const validStateWithHyphens = 'abc-123-def-456-' + 'a'.repeat(16);
      expect(isValidOAuthStateFormat(validState)).toBe(true);
      expect(isValidOAuthStateFormat(validStateWithHyphens)).toBe(true);
    });

    it('should reject states outside length limits', () => {
      expect(isValidOAuthStateFormat('a'.repeat(31))).toBe(false);
      expect(isValidOAuthStateFormat('a'.repeat(129))).toBe(false);
    });

    it('should reject states with invalid characters', () => {
      expect(isValidOAuthStateFormat('a'.repeat(32) + '_')).toBe(false);
      expect(isValidOAuthStateFormat('a'.repeat(32) + '+')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(isValidOAuthStateFormat(null as any)).toBe(false);
      expect(isValidOAuthStateFormat(undefined as any)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://api.example.com/callback')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false); // Only http/https allowed
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(isValidUrl(null as any)).toBe(false);
      expect(isValidUrl(undefined as any)).toBe(false);
    });
  });

  describe('sanitizeDisplayName', () => {
    it('should trim whitespace', () => {
      expect(sanitizeDisplayName(' John ')).toBe('John');
      expect(sanitizeDisplayName('  John  ')).toBe('John');
    });

    it('should replace multiple spaces with single space', () => {
      expect(sanitizeDisplayName('John    Doe')).toBe('John Doe');
      expect(sanitizeDisplayName('John  \t  Doe')).toBe('John Doe');
    });

    it('should enforce max length', () => {
      const longName = 'a'.repeat(150);
      expect(sanitizeDisplayName(longName)).toHaveLength(100);
    });

    it('should handle empty or invalid inputs', () => {
      expect(sanitizeDisplayName('')).toBe('');
      expect(sanitizeDisplayName(null as any)).toBe('');
      expect(sanitizeDisplayName(undefined as any)).toBe('');
    });
  });

  describe('validateUserProfile', () => {
    it('should validate valid user profile', () => {
      const result = validateUserProfile({
        email: 'user@example.com',
        displayName: 'John Doe',
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid email', () => {
      const result = validateUserProfile({
        email: 'invalid-email',
        displayName: 'John Doe',
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should detect invalid display name', () => {
      const result = validateUserProfile({
        email: 'user@example.com',
        displayName: ' John ',
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect multiple validation errors', () => {
      const result = validateUserProfile({
        email: 'invalid',
        displayName: '',
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate when fields are undefined', () => {
      const result = validateUserProfile({});
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});