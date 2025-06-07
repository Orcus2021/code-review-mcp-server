import { describe, it, expect } from '@jest/globals';
import { getPRNumberFromUrl, getRepoInfoFromUrl } from '../parseGithubUrl';

describe('parseGithubUrl', () => {
  describe('getPRNumberFromUrl', () => {
    it('should extract PR number from valid URL', () => {
      const url = 'https://github.com/owner/repo/pull/123';
      const result = getPRNumberFromUrl(url);
      expect(result).toBe('123');
    });

    it('should extract PR number from URL with trailing slash', () => {
      const url = 'https://github.com/owner/repo/pull/456/';
      const result = getPRNumberFromUrl(url);
      expect(result).toBe('456');
    });

    it('should extract PR number from URL with additional path', () => {
      const url = 'https://github.com/owner/repo/pull/789/files';
      const result = getPRNumberFromUrl(url);
      expect(result).toBe('789');
    });

    it('should throw error for invalid URL without pull', () => {
      const url = 'https://github.com/owner/repo/issues/123';
      expect(() => getPRNumberFromUrl(url)).toThrow('Could not extract PR number from URL');
    });

    it('should throw error for URL without PR number', () => {
      const url = 'https://github.com/owner/repo/pull/';
      expect(() => getPRNumberFromUrl(url)).toThrow('Could not extract PR number from URL');
    });

    it('should throw error for completely invalid URL', () => {
      const url = 'not-a-github-url';
      expect(() => getPRNumberFromUrl(url)).toThrow('Could not extract PR number from URL');
    });

    it('should handle PR number with multiple digits', () => {
      const url = 'https://github.com/owner/repo/pull/12345';
      const result = getPRNumberFromUrl(url);
      expect(result).toBe('12345');
    });
  });

  describe('getRepoInfoFromUrl', () => {
    it('should extract owner and repo from valid URL', () => {
      const url = 'https://github.com/testowner/testrepo/pull/123';
      const result = getRepoInfoFromUrl(url);
      expect(result).toEqual({
        owner: 'testowner',
        repo: 'testrepo',
      });
    });

    it('should extract owner and repo from URL without pull path', () => {
      const url = 'https://github.com/myowner/myrepo';
      const result = getRepoInfoFromUrl(url);
      expect(result).toEqual({
        owner: 'myowner',
        repo: 'myrepo',
      });
    });

    it('should extract owner and repo from URL with additional paths', () => {
      const url = 'https://github.com/owner123/repo456/issues/789';
      const result = getRepoInfoFromUrl(url);
      expect(result).toEqual({
        owner: 'owner123',
        repo: 'repo456',
      });
    });

    it('should handle owner and repo with special characters', () => {
      const url = 'https://github.com/owner-name/repo_name/pull/123';
      const result = getRepoInfoFromUrl(url);
      expect(result).toEqual({
        owner: 'owner-name',
        repo: 'repo_name',
      });
    });

    it('should throw error for invalid URL without github.com', () => {
      const url = 'https://gitlab.com/owner/repo/pull/123';
      expect(() => getRepoInfoFromUrl(url)).toThrow(
        'Could not extract repository information from URL',
      );
    });

    it('should throw error for URL without owner/repo structure', () => {
      const url = 'https://github.com/';
      expect(() => getRepoInfoFromUrl(url)).toThrow(
        'Could not extract repository information from URL',
      );
    });

    it('should throw error for completely invalid URL', () => {
      const url = 'not-a-url';
      expect(() => getRepoInfoFromUrl(url)).toThrow(
        'Could not extract repository information from URL',
      );
    });

    it('should handle URL with www prefix', () => {
      const url = 'https://www.github.com/owner/repo/pull/123';
      const result = getRepoInfoFromUrl(url);
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
      });
    });
  });
});
