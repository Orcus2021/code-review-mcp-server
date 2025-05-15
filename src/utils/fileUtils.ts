import micromatch from 'micromatch';
import { LARGE_FILE_THRESHOLD } from '../constants/largeFileThreshold.js';

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface FileCategories<T extends { path: string; changes: number }> {
  largeFiles: T[];
  normalFiles: T[];
}

/**
 * Get ignore patterns from environment variable
 */
export const getIgnorePatterns = (): string[] => {
  const ignorePathPattern = process.env.IGNORE_PATTERNS || '';
  if (!ignorePathPattern) {
    return [];
  }

  return ignorePathPattern
    .split(',')
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0)
    .filter((pattern) => {
      try {
        micromatch.makeRe(pattern);
        return true;
      } catch {
        return false;
      }
    });
};

/**
 * Check if a file should be ignored based on ignore patterns
 */
export const shouldIgnoreFile = (filePath: string, ignorePatterns: string[]): boolean => {
  if (ignorePatterns.length === 0) {
    return false;
  }
  return micromatch.isMatch(filePath, ignorePatterns);
};

/**
 * Categorize files into large and normal files
 */
export const categorizeFiles = <T extends { path: string; changes: number }>(
  files: T[],
  ignorePatterns: string[],
): FileCategories<T> => {
  return files.reduce(
    (acc, file) => {
      if (!shouldIgnoreFile(file.path, ignorePatterns)) {
        if (file.changes > LARGE_FILE_THRESHOLD) {
          acc.largeFiles.push(file);
        } else {
          acc.normalFiles.push(file);
        }
      }
      return acc;
    },
    { largeFiles: [], normalFiles: [] } as FileCategories<T>,
  );
};

/**
 * Generate large files diff message
 */
export const generateLargeFilesDiffMessage = (
  largeFiles: { path: string; changes: number }[],
): string => {
  if (largeFiles.length === 0) {
    return '';
  }

  let message = 'Large files (changes > 1000) that were skipped:\n';
  largeFiles.forEach((file) => {
    message += `diff --git a/${file.path} b/${file.path}\n`;
    message += `@@ File too large to display (${file.changes} changes) @@\n\n`;
  });

  return message;
};

/**
 * Generate change files list message
 */
export const generateChangeFilesList = (files: { path: string }[]): string => {
  if (files.length === 0) {
    return '';
  }
  return `CHANGE_FILES= ${files.map((f) => f.path).join(',\n')}\n`;
};
