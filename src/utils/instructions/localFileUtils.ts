import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { ValidationResult } from '../../types/validationResult.js';
import { LOCAL_FILE_MAX_SIZE } from '../../constants/localFileMaxSize.js';

/**
 * Validate if a file path has a markdown extension
 */
export function validateMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.markdown';
}

/**
 * Get system directories based on the current platform
 */
function getSystemDirectories(): string[] {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows system directories
    const systemRoot = process.env.SystemRoot || 'C:\\Windows';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    return [
      systemRoot,
      path.join(systemRoot, 'System32'),
      path.join(systemRoot, 'SysWOW64'),
      programFiles,
      programFilesX86,
      'C:\\Windows',
      'C:\\Program Files',
      'C:\\Program Files (x86)',
    ];
  } else {
    // Unix/Linux/macOS system directories
    return ['/etc', '/usr', '/bin', '/sbin', '/var', '/sys', '/proc', '/boot', '/dev'];
  }
}

/**
 * Validate if a file path is safe (prevent directory traversal attacks)
 */
export async function isValidPath(filePath: string): Promise<boolean> {
  try {
    // Get the absolute path
    const absolutePath = path.resolve(filePath);

    // Get real path to resolve symlinks
    let realPath: string;
    try {
      realPath = await fs.realpath(absolutePath);
    } catch {
      // If realpath fails, use the absolute path for validation
      // This handles cases where the file doesn't exist yet
      realPath = absolutePath;
    }

    // Check for directory traversal by comparing the resolved path
    // with a safe base directory (current working directory)
    const cwd = process.cwd();
    const relativePath = path.relative(cwd, realPath);

    // If the relative path starts with '..' or is absolute, it's trying to escape
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      // Allow access only to files within the current working directory and its subdirectories
      // unless it's an explicitly allowed absolute path
      if (!isAllowedAbsolutePath(realPath)) {
        return false;
      }
    }

    // Check against system directories
    const systemDirs = getSystemDirectories();
    const isSystemPath = systemDirs.some((dir) => {
      const normalizedSystemDir = path.resolve(dir);
      return realPath.startsWith(normalizedSystemDir);
    });

    if (isSystemPath) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an absolute path is explicitly allowed
 * This can be customized based on your application's needs
 */
function isAllowedAbsolutePath(absolutePath: string): boolean {
  // Define allowed absolute paths (customize as needed)
  const allowedPaths = [
    os.homedir(), // User's home directory
    os.tmpdir(), // Temporary directory
  ];

  return allowedPaths.some((allowedPath) => {
    const normalizedAllowedPath = path.resolve(allowedPath);
    return absolutePath.startsWith(normalizedAllowedPath);
  });
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
    const isPathValid = await isValidPath(filePath);
    if (!isPathValid) {
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
    const maxSize = LOCAL_FILE_MAX_SIZE;
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
