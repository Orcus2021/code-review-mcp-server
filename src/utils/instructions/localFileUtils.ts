import { promises as fs } from 'fs';
import path from 'path';
import type { ValidationResult } from '../../types/validationResult.js';

/**
 * Validate if a file path has a markdown extension
 */
export function validateMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.markdown';
}

/**
 * Validate if a file path is safe (prevent directory traversal attacks)
 */
export function isValidPath(filePath: string): boolean {
  try {
    // Resolve the path to get absolute path
    const resolvedPath = path.resolve(filePath);

    // Check if the resolved path contains any directory traversal patterns
    const normalizedPath = path.normalize(filePath);

    // Reject paths that contain '..' or other suspicious patterns
    if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
      return false;
    }

    // Additional security: ensure the path doesn't access system directories
    const systemDirs = ['/etc', '/usr', '/bin', '/sbin', '/var', '/sys', '/proc'];
    const isSystemPath = systemDirs.some((dir) => resolvedPath.startsWith(dir));

    return !isSystemPath;
  } catch {
    return false;
  }
}

/**
 * Check if file exists and is readable
 */
export async function checkFileAccess(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Read local markdown file with security validation
 */
export async function readLocalMarkdownFile(filePath: string): Promise<ValidationResult<string>> {
  try {
    // Security validation
    if (!isValidPath(filePath)) {
      return {
        isValid: false,
        errorMessage: 'Invalid file path: potential security risk detected',
      };
    }

    // File type validation
    if (!validateMarkdownFile(filePath)) {
      return {
        isValid: false,
        errorMessage: 'Invalid file type: only .md and .markdown files are supported',
      };
    }

    // Check file existence and accessibility
    const canAccess = await checkFileAccess(filePath);
    if (!canAccess) {
      return {
        isValid: false,
        errorMessage: `File not found or not readable: ${filePath}`,
      };
    }

    // Check file size (limit to 1MB)
    const stats = await fs.stat(filePath);
    const maxSize = 1024 * 1024; // 1MB
    if (stats.size > maxSize) {
      return {
        isValid: false,
        errorMessage: `File too large: ${stats.size} bytes (max: ${maxSize} bytes)`,
      };
    }

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Basic content validation
    if (!content.trim()) {
      return {
        isValid: false,
        errorMessage: 'File is empty or contains only whitespace',
      };
    }

    return {
      isValid: true,
      data: content,
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
