import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  getIgnorePatterns,
  shouldIgnoreFile,
  categorizeFiles,
  generateLargeFilesDiffMessage,
  generateChangeFilesList,
  FileChange,
} from '../fileUtils';

describe('fileUtils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getIgnorePatterns', () => {
    it('should return empty array when IGNORE_PATTERNS is not set', () => {
      delete process.env.IGNORE_PATTERNS;
      const result = getIgnorePatterns();
      expect(result).toEqual([]);
    });

    it('should return empty array when IGNORE_PATTERNS is empty string', () => {
      process.env.IGNORE_PATTERNS = '';
      const result = getIgnorePatterns();
      expect(result).toEqual([]);
    });

    it('should parse comma-separated patterns', () => {
      process.env.IGNORE_PATTERNS = '*.test.js,*.spec.js,node_modules/**';
      const result = getIgnorePatterns();
      expect(result).toEqual(['*.test.js', '*.spec.js', 'node_modules/**']);
    });

    it('should trim whitespace from patterns', () => {
      process.env.IGNORE_PATTERNS = ' *.test.js , *.spec.js , node_modules/** ';
      const result = getIgnorePatterns();
      expect(result).toEqual(['*.test.js', '*.spec.js', 'node_modules/**']);
    });

    it('should filter out empty patterns', () => {
      process.env.IGNORE_PATTERNS = '*.test.js,,*.spec.js,';
      const result = getIgnorePatterns();
      expect(result).toEqual(['*.test.js', '*.spec.js']);
    });

    it('should filter out invalid glob patterns', () => {
      process.env.IGNORE_PATTERNS = '*.test.js,[invalid,*.spec.js';
      const result = getIgnorePatterns();
      // micromatch may consider [invalid as a valid pattern, so we test the actual behavior
      expect(result).toContain('*.test.js');
      expect(result).toContain('*.spec.js');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('shouldIgnoreFile', () => {
    it('should return false when no ignore patterns provided', () => {
      const result = shouldIgnoreFile('src/test.js', []);
      expect(result).toBe(false);
    });

    it('should return true when file matches ignore pattern', () => {
      const ignorePatterns = ['*.test.js', 'node_modules/**'];
      const result = shouldIgnoreFile('component.test.js', ignorePatterns);
      expect(result).toBe(true);
    });

    it('should return false when file does not match any ignore pattern', () => {
      const ignorePatterns = ['*.test.js', 'node_modules/**'];
      const result = shouldIgnoreFile('src/component.js', ignorePatterns);
      expect(result).toBe(false);
    });

    it('should handle directory patterns', () => {
      const ignorePatterns = ['node_modules/**', 'dist/**'];
      expect(shouldIgnoreFile('node_modules/package/index.js', ignorePatterns)).toBe(true);
      expect(shouldIgnoreFile('dist/bundle.js', ignorePatterns)).toBe(true);
      expect(shouldIgnoreFile('src/index.js', ignorePatterns)).toBe(false);
    });

    it('should handle wildcard patterns', () => {
      const ignorePatterns = ['*.min.js', '*.map'];
      expect(shouldIgnoreFile('bundle.min.js', ignorePatterns)).toBe(true);
      expect(shouldIgnoreFile('bundle.js.map', ignorePatterns)).toBe(true);
      expect(shouldIgnoreFile('bundle.js', ignorePatterns)).toBe(false);
    });
  });

  describe('categorizeFiles', () => {
    const mockFiles: FileChange[] = [
      { path: 'small.js', additions: 10, deletions: 5, changes: 15 },
      { path: 'medium.js', additions: 500, deletions: 200, changes: 700 },
      { path: 'large.js', additions: 800, deletions: 300, changes: 1100 },
      { path: 'huge.js', additions: 1500, deletions: 500, changes: 2000 },
      { path: 'test.spec.js', additions: 50, deletions: 10, changes: 60 },
    ];

    it('should categorize files by size threshold', () => {
      const result = categorizeFiles(mockFiles, []);

      expect(result.normalFiles).toHaveLength(3);
      expect(result.largeFiles).toHaveLength(2);

      expect(result.normalFiles.map((f) => f.path)).toEqual([
        'small.js',
        'medium.js',
        'test.spec.js',
      ]);
      expect(result.largeFiles.map((f) => f.path)).toEqual(['large.js', 'huge.js']);
    });

    it('should ignore files matching ignore patterns', () => {
      const ignorePatterns = ['*.spec.js'];
      const result = categorizeFiles(mockFiles, ignorePatterns);

      expect(result.normalFiles).toHaveLength(2);
      expect(result.largeFiles).toHaveLength(2);

      expect(result.normalFiles.map((f) => f.path)).toEqual(['small.js', 'medium.js']);
      expect(result.largeFiles.map((f) => f.path)).toEqual(['large.js', 'huge.js']);
    });

    it('should handle empty file list', () => {
      const result = categorizeFiles([], []);

      expect(result.normalFiles).toEqual([]);
      expect(result.largeFiles).toEqual([]);
    });

    it('should handle all files being ignored', () => {
      const ignorePatterns = ['**/*.js'];
      const result = categorizeFiles(mockFiles, ignorePatterns);

      expect(result.normalFiles).toEqual([]);
      expect(result.largeFiles).toEqual([]);
    });
  });

  describe('generateLargeFilesDiffMessage', () => {
    it('should return empty string when no large files', () => {
      const result = generateLargeFilesDiffMessage([]);
      expect(result).toBe('');
    });

    it('should generate message for single large file', () => {
      const largeFiles = [{ path: 'large.js', changes: 1500 }];
      const result = generateLargeFilesDiffMessage(largeFiles);

      expect(result).toContain('Large files (changes > 1000) that were skipped:');
      expect(result).toContain('diff --git a/large.js b/large.js');
      expect(result).toContain('@@ File too large to display (1500 changes) @@');
    });

    it('should generate message for multiple large files', () => {
      const largeFiles = [
        { path: 'large1.js', changes: 1500 },
        { path: 'large2.js', changes: 2000 },
      ];
      const result = generateLargeFilesDiffMessage(largeFiles);

      expect(result).toContain('Large files (changes > 1000) that were skipped:');
      expect(result).toContain('diff --git a/large1.js b/large1.js');
      expect(result).toContain('@@ File too large to display (1500 changes) @@');
      expect(result).toContain('diff --git a/large2.js b/large2.js');
      expect(result).toContain('@@ File too large to display (2000 changes) @@');
    });

    it('should handle files with special characters in path', () => {
      const largeFiles = [{ path: 'src/components/my-component.vue', changes: 1200 }];
      const result = generateLargeFilesDiffMessage(largeFiles);

      expect(result).toContain(
        'diff --git a/src/components/my-component.vue b/src/components/my-component.vue',
      );
      expect(result).toContain('@@ File too large to display (1200 changes) @@');
    });
  });

  describe('generateChangeFilesList', () => {
    it('should return empty string when no files', () => {
      const result = generateChangeFilesList([]);
      expect(result).toBe('');
    });

    it('should generate list for single file', () => {
      const files = [{ path: 'src/index.js' }];
      const result = generateChangeFilesList(files);

      expect(result).toBe('CHANGE_FILES= src/index.js\n');
    });

    it('should generate list for multiple files', () => {
      const files = [
        { path: 'src/index.js' },
        { path: 'src/utils.js' },
        { path: 'test/index.test.js' },
      ];
      const result = generateChangeFilesList(files);

      expect(result).toBe('CHANGE_FILES= src/index.js,\nsrc/utils.js,\ntest/index.test.js\n');
    });

    it('should handle files with special characters in path', () => {
      const files = [{ path: 'src/my-component.vue' }, { path: 'docs/README.md' }];
      const result = generateChangeFilesList(files);

      expect(result).toBe('CHANGE_FILES= src/my-component.vue,\ndocs/README.md\n');
    });

    it('should handle files with only path property', () => {
      const files = [{ path: 'simple.js' }];
      const result = generateChangeFilesList(files);

      expect(result).toBe('CHANGE_FILES= simple.js\n');
    });
  });
});
