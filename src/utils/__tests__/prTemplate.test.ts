import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { findAndReadTemplate, getDefaultTemplate } from '../prTemplate';
import * as localFileUtils from '../localFileUtils';

// Mock the localFileUtils module
jest.mock('../localFileUtils');

const mockReadLocalMarkdownFile = localFileUtils.readLocalMarkdownFile as jest.MockedFunction<
  typeof localFileUtils.readLocalMarkdownFile
>;

beforeEach(() => {
  jest.clearAllMocks();
});
describe('prTemplate', () => {
  describe('getDefaultTemplate', () => {
    it('should return default template content', () => {
      const result = getDefaultTemplate();

      expect(result).toContain('# Purpose');
      expect(result).toContain('## Changes');
      expect(result).toContain('## How to Review');
      expect(result).toContain('## Notes');
    });
  });

  describe('findAndReadTemplate', () => {
    it('should return template from .github/PULL_REQUEST_TEMPLATE/ directory (highest priority)', async () => {
      const templateContent = '# Custom Template from .github/PULL_REQUEST_TEMPLATE/';

      mockReadLocalMarkdownFile
        .mockResolvedValueOnce({ isValid: true, data: templateContent })
        .mockResolvedValue({ isValid: false, errorMessage: 'File not found' });

      const result = await findAndReadTemplate('/test/repo');

      expect(result).toEqual({
        found: true,
        content: templateContent,
        filePath: '/test/repo/.github/PULL_REQUEST_TEMPLATE/pull_request_template.md',
      });

      expect(mockReadLocalMarkdownFile).toHaveBeenCalledWith(
        '/test/repo/.github/PULL_REQUEST_TEMPLATE/pull_request_template.md',
      );
    });

    it('should return template from .github/ directory when higher priority not found', async () => {
      const templateContent = '# Custom Template from .github/';

      mockReadLocalMarkdownFile
        .mockResolvedValueOnce({ isValid: false, errorMessage: 'File not found' }) // .github/PULL_REQUEST_TEMPLATE/
        .mockResolvedValueOnce({ isValid: true, data: templateContent }) // .github/
        .mockResolvedValue({ isValid: false, errorMessage: 'File not found' });

      const result = await findAndReadTemplate('/test/repo');

      expect(result).toEqual({
        found: true,
        content: templateContent,
        filePath: '/test/repo/.github/pull_request_template.md',
      });
    });

    it('should return template from docs/ directory when higher priorities not found', async () => {
      const templateContent = '# Custom Template from docs/';

      mockReadLocalMarkdownFile
        .mockResolvedValueOnce({ isValid: false, errorMessage: 'File not found' }) // .github/PULL_REQUEST_TEMPLATE/
        .mockResolvedValueOnce({ isValid: false, errorMessage: 'File not found' }) // .github/
        .mockResolvedValueOnce({ isValid: true, data: templateContent }) // docs/
        .mockResolvedValue({ isValid: false, errorMessage: 'File not found' });

      const result = await findAndReadTemplate('/test/repo');

      expect(result).toEqual({
        found: true,
        content: templateContent,
        filePath: '/test/repo/docs/pull_request_template.md',
      });
    });

    it('should return template from root directory when higher priorities not found', async () => {
      const templateContent = '# Custom Template from root';

      mockReadLocalMarkdownFile
        .mockResolvedValueOnce({ isValid: false, errorMessage: 'File not found' }) // .github/PULL_REQUEST_TEMPLATE/
        .mockResolvedValueOnce({ isValid: false, errorMessage: 'File not found' }) // .github/
        .mockResolvedValueOnce({ isValid: false, errorMessage: 'File not found' }) // docs/
        .mockResolvedValueOnce({ isValid: true, data: templateContent }) // root
        .mockResolvedValue({ isValid: false, errorMessage: 'File not found' });

      const result = await findAndReadTemplate('/test/repo');

      expect(result).toEqual({
        found: true,
        content: templateContent,
        filePath: '/test/repo/pull_request_template.md',
      });
    });

    it('should return default template when no template file found', async () => {
      mockReadLocalMarkdownFile.mockResolvedValue({
        isValid: false,
        errorMessage: 'File not found',
      });

      const result = await findAndReadTemplate('/test/repo');

      expect(result.found).toBe(false);
      expect(result.content).toContain('# Purpose');
      expect(result.filePath).toBeUndefined();

      // Should have tried all 6 paths
      expect(mockReadLocalMarkdownFile).toHaveBeenCalledTimes(6);
    });

    it('should use custom template name when provided', async () => {
      const templateContent = '# Custom Named Template';

      mockReadLocalMarkdownFile
        .mockResolvedValueOnce({ isValid: true, data: templateContent })
        .mockResolvedValue({ isValid: false, errorMessage: 'File not found' });

      const result = await findAndReadTemplate('/test/repo', 'custom_template.md');

      expect(result).toEqual({
        found: true,
        content: templateContent,
        filePath: '/test/repo/.github/PULL_REQUEST_TEMPLATE/custom_template.md',
      });

      expect(mockReadLocalMarkdownFile).toHaveBeenCalledWith(
        '/test/repo/.github/PULL_REQUEST_TEMPLATE/custom_template.md',
      );
    });

    it('should search all paths in correct priority order', async () => {
      mockReadLocalMarkdownFile.mockResolvedValue({
        isValid: false,
        errorMessage: 'File not found',
      });

      await findAndReadTemplate('/test/repo');

      const expectedPaths = [
        '/test/repo/.github/PULL_REQUEST_TEMPLATE/pull_request_template.md',
        '/test/repo/.github/pull_request_template.md',
        '/test/repo/docs/pull_request_template.md',
        '/test/repo/pull_request_template.md',
        '/test/repo/PULL_REQUEST_TEMPLATE/pull_request_template.md',
        '/test/repo/docs/PULL_REQUEST_TEMPLATE/pull_request_template.md',
      ];

      expectedPaths.forEach((path, index) => {
        expect(mockReadLocalMarkdownFile).toHaveBeenNthCalledWith(index + 1, path);
      });
    });

    it('should handle empty folder path', async () => {
      const templateContent = '# Template from empty path';

      mockReadLocalMarkdownFile
        .mockResolvedValueOnce({ isValid: true, data: templateContent })
        .mockResolvedValue({ isValid: false, errorMessage: 'File not found' });

      const result = await findAndReadTemplate('');

      expect(result.found).toBe(true);
      expect(mockReadLocalMarkdownFile).toHaveBeenCalledWith(
        '.github/PULL_REQUEST_TEMPLATE/pull_request_template.md',
      );
    });

    it('should stop searching after finding first valid template', async () => {
      const templateContent = '# First Found Template';

      mockReadLocalMarkdownFile
        .mockResolvedValueOnce({ isValid: false, errorMessage: 'File not found' }) // First path fails
        .mockResolvedValueOnce({ isValid: true, data: templateContent }) // Second path succeeds
        .mockResolvedValue({ isValid: true, data: 'Should not reach here' }); // Should not be called

      const result = await findAndReadTemplate('/test/repo');

      expect(result.found).toBe(true);
      expect(result.content).toBe(templateContent);
      expect(mockReadLocalMarkdownFile).toHaveBeenCalledTimes(2); // Should stop after finding first valid
    });
  });
});
