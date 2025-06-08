import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  validateMarkdownFile,
  checkFileAccess,
  isValidPath,
  readLocalMarkdownFile,
} from '../localFileUtils';
import { LOCAL_FILE_MAX_SIZE } from '../../constants/localFileMaxSize';

// Mock fs and os modules
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    realpath: jest.fn(),
  },
  constants: {
    R_OK: 4,
  },
}));

jest.mock('os');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockOs = os as jest.Mocked<typeof os>;

describe('localFileUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockPath.extname.mockImplementation((filePath) => {
      const parts = filePath.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    });

    mockPath.resolve.mockImplementation((filePath) => `/resolved/${filePath}`);
    mockPath.relative.mockImplementation((from, to) => {
      if (to.includes('..')) return '../dangerous/path';
      return 'safe/path';
    });
    mockPath.isAbsolute.mockImplementation((filePath) => filePath.startsWith('/'));
    mockOs.platform.mockReturnValue('darwin');
    mockOs.homedir.mockReturnValue('/Users/testuser');
    mockOs.tmpdir.mockReturnValue('/tmp');

    // Mock process.cwd
    jest.spyOn(process, 'cwd').mockReturnValue('/current/working/directory');
  });

  describe('validateMarkdownFile', () => {
    it('should return true for .md files', () => {
      const result = validateMarkdownFile('test.md');
      expect(result).toBe(true);
    });

    it('should return true for .markdown files', () => {
      const result = validateMarkdownFile('test.markdown');
      expect(result).toBe(true);
    });

    it('should return true for uppercase extensions', () => {
      mockPath.extname.mockReturnValue('.MD');
      const result = validateMarkdownFile('test.MD');
      expect(result).toBe(true);
    });

    it('should return false for non-markdown files', () => {
      const result = validateMarkdownFile('test.txt');
      expect(result).toBe(false);
    });

    it('should return false for files without extension', () => {
      const result = validateMarkdownFile('test');
      expect(result).toBe(false);
    });
  });

  describe('checkFileAccess', () => {
    it('should return true for accessible files', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
      } as any);

      const result = await checkFileAccess('test.md');

      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('test.md', fs.constants.R_OK);
      expect(mockFs.stat).toHaveBeenCalledWith('test.md');
    });

    it('should return false for inaccessible files', async () => {
      mockFs.access.mockRejectedValue(new Error('Permission denied'));

      const result = await checkFileAccess('test.md');

      expect(result).toBe(false);
    });

    it('should return false for directories', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({
        isFile: () => false,
      } as any);

      const result = await checkFileAccess('directory');

      expect(result).toBe(false);
    });

    it('should handle stat errors', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockRejectedValue(new Error('Stat error'));

      const result = await checkFileAccess('test.md');

      expect(result).toBe(false);
    });
  });

  describe('isValidPath', () => {
    beforeEach(() => {
      mockFs.realpath.mockResolvedValue('/resolved/safe/path');
    });

    it('should return true for safe paths', async () => {
      mockPath.relative.mockReturnValue('safe/path');
      mockPath.isAbsolute.mockReturnValue(false);

      const result = await isValidPath('safe/path');

      expect(result).toBe(true);
    });

    it('should return false for directory traversal attempts', async () => {
      mockPath.relative.mockReturnValue('../dangerous/path');
      mockPath.isAbsolute.mockReturnValue(false);

      const result = await isValidPath('../dangerous/path');

      expect(result).toBe(false);
    });

    it('should return false for system directories on Unix', async () => {
      mockOs.platform.mockReturnValue('linux');
      mockFs.realpath.mockResolvedValue('/etc/passwd');
      mockPath.relative.mockReturnValue('/etc/passwd');
      mockPath.isAbsolute.mockReturnValue(true);

      const result = await isValidPath('/etc/passwd');

      expect(result).toBe(false);
    });

    it('should return false for system directories on Windows', async () => {
      mockOs.platform.mockReturnValue('win32');
      mockFs.realpath.mockResolvedValue('C:\\Windows\\System32\\config');
      mockPath.relative.mockReturnValue('C:\\Windows\\System32\\config');
      mockPath.isAbsolute.mockReturnValue(true);

      const result = await isValidPath('C:\\Windows\\System32\\config');

      expect(result).toBe(false);
    });

    it('should return true for allowed absolute paths (home directory)', async () => {
      mockFs.realpath.mockResolvedValue('/Users/testuser/documents/file.md');
      mockPath.relative.mockReturnValue('/Users/testuser/documents/file.md');
      mockPath.isAbsolute.mockReturnValue(true);

      const result = await isValidPath('/Users/testuser/documents/file.md');

      expect(result).toBe(true);
    });

    it('should return true for allowed absolute paths (temp directory)', async () => {
      mockFs.realpath.mockResolvedValue('/tmp/tempfile.md');
      mockPath.relative.mockReturnValue('/tmp/tempfile.md');
      mockPath.isAbsolute.mockReturnValue(true);

      const result = await isValidPath('/tmp/tempfile.md');

      expect(result).toBe(true);
    });

    it('should handle realpath errors gracefully', async () => {
      mockFs.realpath.mockRejectedValue(new Error('File not found'));
      mockPath.relative.mockReturnValue('safe/path');
      mockPath.isAbsolute.mockReturnValue(false);

      const result = await isValidPath('nonexistent/file.md');

      expect(result).toBe(true);
    });

    it('should return false when path resolution throws error', async () => {
      mockPath.resolve.mockImplementation(() => {
        throw new Error('Path resolution error');
      });

      const result = await isValidPath('problematic/path');

      expect(result).toBe(false);
    });
  });

  describe('readLocalMarkdownFile', () => {
    beforeEach(() => {
      // Setup default successful mocks
      mockFs.realpath.mockResolvedValue('/resolved/safe/path.md');
      mockPath.relative.mockReturnValue('safe/path.md');
      mockPath.isAbsolute.mockReturnValue(false);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000,
      } as any);
      mockFs.readFile.mockResolvedValue('# Test Markdown\n\nThis is a test file.');
    });

    it('should successfully read a valid markdown file', async () => {
      const result = await readLocalMarkdownFile('test.md');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.data).toBe('# Test Markdown\n\nThis is a test file.');
      }
    });

    it('should reject invalid file paths', async () => {
      mockPath.relative.mockReturnValue('../dangerous/path');

      const result = await readLocalMarkdownFile('../dangerous/file.md');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toBe('Invalid file path: potential security risk detected');
      }
    });

    it('should reject non-markdown files', async () => {
      const result = await readLocalMarkdownFile('test.txt');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toBe(
          'Invalid file type: only .md and .markdown files are supported',
        );
      }
    });

    it('should reject inaccessible files', async () => {
      mockFs.access.mockRejectedValue(new Error('Permission denied'));

      const result = await readLocalMarkdownFile('test.md');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toBe('File not found or not readable: test.md');
      }
    });

    it('should reject files that are too large', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: LOCAL_FILE_MAX_SIZE + 1,
      } as any);

      const result = await readLocalMarkdownFile('large.md');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toBe(
          `File too large: ${LOCAL_FILE_MAX_SIZE + 1} bytes (max: ${LOCAL_FILE_MAX_SIZE} bytes)`,
        );
      }
    });

    it('should reject empty files', async () => {
      mockFs.readFile.mockResolvedValue('   \n\t  \n  ');

      const result = await readLocalMarkdownFile('empty.md');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toBe('File is empty or contains only whitespace');
      }
    });

    it('should handle file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Read permission denied'));

      const result = await readLocalMarkdownFile('test.md');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toBe('Error reading file: Read permission denied');
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockFs.readFile.mockRejectedValue('String error');

      const result = await readLocalMarkdownFile('test.md');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toBe('Error reading file: String error');
      }
    });

    it('should accept files at the size limit', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: LOCAL_FILE_MAX_SIZE,
      } as any);

      const result = await readLocalMarkdownFile('max-size.md');

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.data).toBe('# Test Markdown\n\nThis is a test file.');
      }
    });

    it('should handle directories instead of files', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => false,
        size: 1000,
      } as any);

      const result = await readLocalMarkdownFile('directory.md');

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errorMessage).toBe('File not found or not readable: directory.md');
      }
    });
  });
});
