import { describe, it, expect } from '@jest/globals';
import {
  addPrefixForComment,
  escapeShellArg,
  escapeComment,
  formatComment,
} from '../formatComment';

describe('formatComment', () => {
  describe('addPrefixForComment', () => {
    it('should add AI review prefix to comment', () => {
      const comment = 'This is a test comment';
      const result = addPrefixForComment(comment);
      expect(result).toBe('🤖AI Review:\n\nThis is a test comment');
    });

    it('should handle empty comment', () => {
      const comment = '';
      const result = addPrefixForComment(comment);
      expect(result).toBe('🤖AI Review:\n\n');
    });

    it('should handle multiline comment', () => {
      const comment = 'Line 1\nLine 2\nLine 3';
      const result = addPrefixForComment(comment);
      expect(result).toBe('🤖AI Review:\n\nLine 1\nLine 2\nLine 3');
    });
  });

  describe('escapeShellArg', () => {
    it('should escape double quotes', () => {
      const input = 'This has "quotes" in it';
      const result = escapeShellArg(input);
      expect(result).toBe('This has \\"quotes\\" in it');
    });

    it('should escape backticks', () => {
      const input = 'This has `backticks` in it';
      const result = escapeShellArg(input);
      expect(result).toBe('This has \\`backticks\\` in it');
    });

    it('should escape dollar signs', () => {
      const input = 'This has $variables in it';
      const result = escapeShellArg(input);
      expect(result).toBe('This has \\$variables in it');
    });

    it('should escape multiple special characters', () => {
      const input = 'Complex "string" with `backticks` and $variables';
      const result = escapeShellArg(input);
      expect(result).toBe('Complex \\"string\\" with \\`backticks\\` and \\$variables');
    });

    it('should handle empty string', () => {
      const input = '';
      const result = escapeShellArg(input);
      expect(result).toBe('');
    });

    it('should handle string without special characters', () => {
      const input = 'Normal string without special chars';
      const result = escapeShellArg(input);
      expect(result).toBe('Normal string without special chars');
    });
  });

  describe('escapeComment', () => {
    it('should be an alias for escapeShellArg', () => {
      const input = 'Test "comment" with `special` $chars';
      const escapeResult = escapeComment(input);
      const shellResult = escapeShellArg(input);
      expect(escapeResult).toBe(shellResult);
    });
  });

  describe('formatComment', () => {
    it('should format comment with prefix and escaping', () => {
      const comment = 'This is a "test" comment with `backticks` and $variables';
      const result = formatComment(comment);
      expect(result).toBe(
        '🤖AI Review:\n\nThis is a \\"test\\" comment with \\`backticks\\` and \\$variables',
      );
    });

    it('should handle empty comment', () => {
      const comment = '';
      const result = formatComment(comment);
      expect(result).toBe('🤖AI Review:\n\n');
    });

    it('should handle comment without special characters', () => {
      const comment = 'Simple comment';
      const result = formatComment(comment);
      expect(result).toBe('🤖AI Review:\n\nSimple comment');
    });
  });
});
