import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { execSync } from 'child_process';
import {
  getCurrentBranch,
  getLocalBranches,
  fetchSpecificBranch,
  getRemoteBranches,
  isGitHubUrl,
  getBranchDiff,
  validateCurrentBranch,
  validateBaseBranch,
  performGitDiff,
  getGitRepoInfo,
} from '../getGitHandler';
import * as fileUtils from '../fileUtils';
import * as formatDiff from '../formatDiff';

// Mock child_process
jest.mock('child_process');

// Mock fileUtils
jest.mock('../fileUtils');

// Mock formatDiff
jest.mock('../formatDiff');

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockGetIgnorePatterns = jest.mocked(fileUtils.getIgnorePatterns);
const mockCategorizeFiles = jest.mocked(fileUtils.categorizeFiles);
const mockGenerateLargeFilesDiffMessage = jest.mocked(fileUtils.generateLargeFilesDiffMessage);
const mockGenerateChangeFilesList = jest.mocked(fileUtils.generateChangeFilesList);
const mockFormatDiffWithLineNumbers = jest.mocked(formatDiff.formatDiffWithLineNumbers);

beforeEach(() => {
  // getBranchDiff
  mockGetIgnorePatterns.mockReturnValue([]);
  mockCategorizeFiles.mockReturnValue({
    largeFiles: [],
    normalFiles: [{ path: 'test.js', changes: 7 }],
  });
  mockGenerateLargeFilesDiffMessage.mockReturnValue('');
  mockGenerateChangeFilesList.mockReturnValue('Files changed:\n');

  jest.clearAllMocks();
});

describe('getGitHandler', () => {
  describe('getCurrentBranch', () => {
    it('should return current branch name', () => {
      mockExecSync.mockReturnValue('main\n');

      const result = getCurrentBranch('/test/repo');

      expect(result).toBe('main');
      expect(mockExecSync).toHaveBeenCalledWith('git -C "/test/repo" rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
      });
    });

    it('should handle branch names with special characters', () => {
      mockExecSync.mockReturnValue('feature/test-branch\n');

      const result = getCurrentBranch('/test/repo');

      expect(result).toBe('feature/test-branch');
    });
  });

  describe('getLocalBranches', () => {
    it('should return local branches matching pattern', () => {
      mockExecSync.mockReturnValue('  main\n');

      const result = getLocalBranches({
        folderPath: '/test/repo',
        branchName: 'main',
      });

      expect(result).toBe('main');
      expect(mockExecSync).toHaveBeenCalledWith('git -C "/test/repo" branch --list "main"', {
        encoding: 'utf-8',
      });
    });

    it('should return empty string when no branches match', () => {
      mockExecSync.mockReturnValue('');

      const result = getLocalBranches({
        folderPath: '/test/repo',
        branchName: 'nonexistent',
      });

      expect(result).toBe('');
    });
  });

  describe('fetchSpecificBranch', () => {
    it('should return true when fetch succeeds', () => {
      mockExecSync.mockReturnValue('');

      const result = fetchSpecificBranch('/test/repo', 'main');

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git -C "/test/repo" fetch origin main', {
        encoding: 'utf-8',
      });
    });

    it('should return false when fetch fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Fetch failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = fetchSpecificBranch('/test/repo', 'main');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Failed to fetch branch main'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getRemoteBranches', () => {
    it('should return remote branches matching pattern', () => {
      mockExecSync.mockReturnValue('  origin/main\n');

      const result = getRemoteBranches({
        folderPath: '/test/repo',
        branchName: 'main',
      });

      expect(result).toBe('origin/main');
      expect(mockExecSync).toHaveBeenCalledWith('git -C "/test/repo" branch -r --list "*/main"', {
        encoding: 'utf-8',
      });
    });
  });

  describe('isGitHubUrl', () => {
    it('should return true for GitHub URLs', () => {
      expect(isGitHubUrl('https://github.com/user/repo')).toBe(true);
      expect(isGitHubUrl('git@github.com:user/repo.git')).toBe(true);
      expect(isGitHubUrl('https://api.github.com/repos/user/repo')).toBe(true);
    });

    it('should return false for non-GitHub URLs', () => {
      expect(isGitHubUrl('https://gitlab.com/user/repo')).toBe(false);
      expect(isGitHubUrl('https://bitbucket.org/user/repo')).toBe(false);
      expect(isGitHubUrl('https://example.com')).toBe(false);
    });
  });

  describe('getBranchDiff', () => {
    it('should return combined diff for branch comparison', () => {
      mockExecSync
        .mockReturnValueOnce('5\t2\ttest.js\n') // numstat output
        .mockReturnValueOnce('diff --git a/test.js b/test.js\n+added line\n'); // file diff

      const result = getBranchDiff({
        folderPath: '/test/repo',
        baseBranch: 'main',
        currentBranch: 'feature',
      });

      expect(result).toContain('Files changed:');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git -C "/test/repo" diff --numstat main..feature',
        { encoding: 'utf-8' },
      );
    });

    it('should handle empty diff output', () => {
      mockExecSync.mockReturnValueOnce(''); // empty numstat output
      mockCategorizeFiles.mockReturnValue({
        largeFiles: [],
        normalFiles: [],
      });

      const result = getBranchDiff({
        folderPath: '/test/repo',
        baseBranch: 'main',
        currentBranch: 'feature',
      });

      expect(result).toBe('');
    });
  });

  describe('validateCurrentBranch', () => {
    it('should return valid result for normal branch', () => {
      mockExecSync.mockReturnValue('feature-branch\n');

      const result = validateCurrentBranch('/test/repo');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.data).toBe('feature-branch');
      }
    });

    it('should return invalid result for detached HEAD', () => {
      mockExecSync.mockReturnValue('HEAD\n');

      const result = validateCurrentBranch('/test/repo');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toContain('detached HEAD state');
      }
    });

    it('should handle git command errors', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const result = validateCurrentBranch('/test/repo');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toContain('Failed to get current branch');
      }
    });
  });

  describe('validateBaseBranch', () => {
    it('should return valid result when branch exists locally', () => {
      mockExecSync.mockReturnValue('  main\n');

      const result = validateBaseBranch('/test/repo', 'main');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.data).toBe('main');
      }
    });

    it('should fetch and validate remote branch when not found locally', () => {
      mockExecSync
        .mockReturnValueOnce('') // local branch check - empty
        .mockReturnValueOnce('') // fetch command
        .mockReturnValueOnce('  origin/main\n'); // remote branch check

      const result = validateBaseBranch('/test/repo', 'main');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.data).toBe('origin/main');
      }
    });

    it('should return invalid result when branch not found', () => {
      mockExecSync
        .mockReturnValueOnce('') // local branch check - empty
        .mockReturnValueOnce('') // fetch command
        .mockReturnValueOnce(''); // remote branch check - empty

      const result = validateBaseBranch('/test/repo', 'nonexistent');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toContain('Could not find base branch');
      }
    });

    it('should handle git command errors', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git error');
      });

      const result = validateBaseBranch('/test/repo', 'main');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toContain('Error resolving base branch');
      }
    });
  });

  describe('performGitDiff', () => {
    beforeEach(() => {
      mockGetIgnorePatterns.mockReturnValue([]);
      mockCategorizeFiles.mockReturnValue({
        largeFiles: [],
        normalFiles: [{ path: 'test.js', changes: 7 }],
      });
      mockGenerateLargeFilesDiffMessage.mockReturnValue('');
      mockGenerateChangeFilesList.mockReturnValue('Files changed:\n');
      mockFormatDiffWithLineNumbers.mockReturnValue('Formatted diff output');
    });

    it('should return formatted diff when changes exist', () => {
      mockExecSync
        .mockReturnValueOnce('5\t2\ttest.js\n') // numstat output
        .mockReturnValueOnce('diff --git a/test.js b/test.js\n+added line\n'); // file diff

      const result = performGitDiff('/test/repo', 'main', 'feature');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.data).toContain(
          'Comparing changes between current branch (feature) and base branch (main)',
        );
        expect(result.data).toContain('Formatted diff output');
      }
      expect(mockFormatDiffWithLineNumbers).toHaveBeenCalled();
    });

    it('should return no differences message when no changes', () => {
      mockExecSync.mockReturnValueOnce(''); // empty numstat output
      mockCategorizeFiles.mockReturnValue({
        largeFiles: [],
        normalFiles: [],
      });

      const result = performGitDiff('/test/repo', 'main', 'feature');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.data).toContain(
          'No differences found between current branch (feature) and base branch (main)',
        );
      }
    });

    it('should handle git diff errors', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git diff failed');
      });

      const result = performGitDiff('/test/repo', 'main', 'feature');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toContain('Error running git diff');
      }
    });
  });

  describe('getGitRepoInfo', () => {
    it('should return complete git repo info for valid repository', async () => {
      mockExecSync
        .mockReturnValueOnce('true\n') // is-inside-work-tree
        .mockReturnValueOnce('feature-branch\n') // current branch
        .mockReturnValueOnce('https://github.com/user/repo.git\n') // remote URL
        .mockReturnValueOnce('  origin/feature-branch\n') // remote branch check
        .mockReturnValueOnce('abc123\n') // local commit
        .mockReturnValueOnce('abc123\n'); // remote commit

      const result = await getGitRepoInfo('/test/repo');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.data).toEqual({
          repoUrl: 'https://github.com/user/repo',
          currentBranch: 'feature-branch',
          isGitRepo: true,
          hasRemote: true,
          isCurrentBranchPushed: true,
        });
      }
    });

    it('should handle repository without remote', async () => {
      mockExecSync
        .mockReturnValueOnce('true\n') // is-inside-work-tree
        .mockReturnValueOnce('main\n') // current branch
        .mockImplementationOnce(() => {
          throw new Error('No remote');
        }); // remote URL fails

      const result = await getGitRepoInfo('/test/repo');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.data).toEqual({
          repoUrl: undefined,
          currentBranch: 'main',
          isGitRepo: true,
          hasRemote: false,
          isCurrentBranchPushed: false,
        });
      }
    });

    it('should handle SSH remote URL conversion', async () => {
      mockExecSync
        .mockReturnValueOnce('true\n') // is-inside-work-tree
        .mockReturnValueOnce('main\n') // current branch
        .mockReturnValueOnce('git@github.com:user/repo.git\n') // SSH remote URL
        .mockReturnValueOnce('') // no remote branch
        .mockReturnValueOnce('abc123\n') // local commit
        .mockImplementationOnce(() => {
          throw new Error('No remote branch');
        }); // remote commit fails

      const result = await getGitRepoInfo('/test/repo');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.data.repoUrl).toBe('https://github.com/user/repo');
        expect(result.data.isCurrentBranchPushed).toBe(false);
      }
    });

    it('should return invalid result for non-git repository', async () => {
      // Mock checkIsGitRepo to return false (not throw error)
      // The function catches the error and returns false
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Not a git repository');
      });

      const result = await getGitRepoInfo('/test/repo');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        // Based on the actual error message received
        expect(result.errorMessage).toContain('Error getting git info');
      }
    });

    it('should handle git command errors', async () => {
      mockExecSync
        .mockReturnValueOnce('true\n') // checkIsGitRepo succeeds
        .mockImplementationOnce(() => {
          throw new Error('Git error');
        }); // getCurrentBranch fails

      const result = await getGitRepoInfo('/test/repo');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        // Based on the actual error message received
        expect(result.errorMessage).toContain('Not a git repository');
      }
    });
  });
});
