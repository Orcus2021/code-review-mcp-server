import micromatch from 'micromatch';
import type { ValidationResult } from '../../types/validationResult.js';
import type { GitHubProvider, GitHubFileChange } from '../../types/githubProvider.js';
import { LARGE_FILE_THRESHOLD } from '../../constants/largeFileThreshold.js';
import {
  getIgnorePatterns,
  categorizeFiles,
  generateLargeFilesDiffMessage,
  generateChangeFilesList,
} from '../fileUtils.js';

/**
 * Base abstract class for GitHub Diff Provider
 * Implements template method pattern, defining standard process while subclasses implement specific steps
 */
export abstract class BaseGitHubDiffProvider implements GitHubProvider {
  protected readonly LARGE_FILE_THRESHOLD = LARGE_FILE_THRESHOLD;
  private ignorePatterns: string[] = [];

  constructor() {
    this.initIgnorePatterns();
  }

  private initIgnorePatterns(): void {
    this.ignorePatterns = getIgnorePatterns();
  }

  protected shouldIgnoreFile(filePath: string): boolean {
    if (this.ignorePatterns.length === 0) {
      return false;
    }
    return micromatch.isMatch(filePath, this.ignorePatterns);
  }

  /**
   * Get GitHub PR diff
   * Template method defines the processing flow
   */
  async getPRDiff(prUrl: string): Promise<ValidationResult<string>> {
    try {
      if (!this.isValidGitHubPrUrl(prUrl)) {
        return {
          isValid: false,
          errorMessage: 'Invalid GitHub PR URL',
        };
      }

      const files = await this.getFilesList(prUrl);
      const diff = await this.generateDiff(prUrl, files);

      if (!diff || diff.trim() === '') {
        return {
          isValid: false,
          errorMessage: 'No differences found in PR or invalid PR URL',
        };
      }

      return {
        isValid: true,
        data: diff,
      };
    } catch (error) {
      return {
        isValid: false,
        errorMessage: `Error occurred while getting PR diff: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Add summary comment in PR
   * Template method defines the process
   */
  async addPRSummaryComment({
    prUrl,
    commentMessage,
  }: {
    prUrl: string;
    commentMessage: string;
  }): Promise<ValidationResult<string>> {
    try {
      if (!this.isValidGitHubPrUrl(prUrl)) {
        return {
          isValid: false,
          errorMessage: 'Invalid GitHub PR URL',
        };
      }

      const result = await this.postPRSummaryComment({ prUrl, commentMessage });
      return {
        isValid: true,
        data: result,
      };
    } catch (error) {
      return {
        isValid: false,
        errorMessage: `Error occurred while adding PR comment: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Add comment to a specific line in PR
   * Template method defines the process
   */
  async addPRLineComment({
    prUrl,
    filePath,
    line,
    commentMessage,
  }: {
    prUrl: string;
    filePath: string;
    line: number;
    commentMessage: string;
  }): Promise<ValidationResult<string>> {
    try {
      if (!this.isValidGitHubPrUrl(prUrl)) {
        return {
          isValid: false,
          errorMessage: 'Invalid GitHub PR URL',
        };
      }

      const result = await this.postPRLineComment({
        prUrl,
        filePath,
        line,
        commentMessage,
      });
      return {
        isValid: true,
        data: result,
      };
    } catch (error) {
      return {
        isValid: false,
        errorMessage: `Error occurred while adding PR line comment: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Validate if the URL is a valid GitHub PR URL
   */
  private isValidGitHubPrUrl(url: string): boolean {
    const pattern = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/;
    return pattern.test(url);
  }

  /**
   * Generate diff content
   * Handle large files and standard files
   */
  protected async generateDiff(prUrl: string, files: GitHubFileChange[]): Promise<string> {
    const { largeFiles, normalFiles } = categorizeFiles(files, this.ignorePatterns);

    if (largeFiles.length === 0 && normalFiles.length === 0) {
      return '';
    }

    let combinedDiff = '';

    combinedDiff += generateLargeFilesDiffMessage(largeFiles);
    combinedDiff += generateChangeFilesList(normalFiles);
    const normalFilesDiff = await this.getNormalFilesDiff(prUrl, normalFiles);
    combinedDiff += normalFilesDiff;

    return combinedDiff;
  }

  /**
   * Abstract method: Get list of file changes
   * To be implemented by subclasses
   */
  protected abstract getFilesList(prUrl: string): Promise<GitHubFileChange[]>;

  /**
   * Abstract method: Get diff for normal-sized files
   * To be implemented by subclasses
   */
  protected abstract getNormalFilesDiff(prUrl: string, files: GitHubFileChange[]): Promise<string>;

  /**
   * Abstract method: add PR summary comment
   * Implemented by subclass
   */
  protected abstract postPRSummaryComment({
    prUrl,
    commentMessage,
  }: {
    prUrl: string;
    commentMessage: string;
  }): Promise<string>;

  /**
   * Abstract method: add PR line comment
   * Implemented by subclass
   */
  protected abstract postPRLineComment({
    prUrl,
    filePath,
    line,
    commentMessage,
  }: {
    prUrl: string;
    filePath: string;
    line: number;
    commentMessage: string;
  }): Promise<string>;
}
