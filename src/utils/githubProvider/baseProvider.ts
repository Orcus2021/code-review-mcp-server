import type { ValidationResult } from "../../types/validationResult.js";
import type {
  GitHubProvider,
  GitHubFileChange,
} from "../../types/githubProvider.js";

/**
 * Base abstract class for GitHub Diff Provider
 * Implements template method pattern, defining standard process while subclasses implement specific steps
 */
export abstract class BaseGitHubDiffProvider implements GitHubProvider {
  protected readonly LARGE_FILE_THRESHOLD = 1000;

  /**
   * Get GitHub PR diff
   * Template method defines the processing flow
   */
  async getPRDiff(prUrl: string): Promise<ValidationResult<string>> {
    try {
      if (!this.isValidGitHubPrUrl(prUrl)) {
        return {
          isValid: false,
          errorMessage: "Invalid GitHub PR URL",
        };
      }

      const files = await this.getFilesList(prUrl);
      const diff = await this.generateDiff(prUrl, files);

      if (!diff || diff.trim() === "") {
        return {
          isValid: false,
          errorMessage: "No differences found in PR or invalid PR URL",
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
          errorMessage: "Invalid GitHub PR URL",
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
          errorMessage: "Invalid GitHub PR URL",
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
  protected async generateDiff(
    prUrl: string,
    files: GitHubFileChange[]
  ): Promise<string> {
    // Check if there are any large files (changes exceeding threshold)
    const hasLargeFile = files.some(
      (file) => file.changes > this.LARGE_FILE_THRESHOLD
    );

    if (!hasLargeFile) {
      // If no large files, use fast method to get complete diff
      return this.getFullDiff(prUrl);
    }

    // Handle cases with large files: classify files into large and normal files
    const largeFiles = files.filter(
      (file) => file.changes > this.LARGE_FILE_THRESHOLD
    );
    const normalFiles = files.filter(
      (file) => file.changes <= this.LARGE_FILE_THRESHOLD
    );

    let combinedDiff = "";

    // Handle large files
    if (largeFiles.length > 0) {
      combinedDiff += "Large files (changes > 1000) that were skipped:\n";
      largeFiles.forEach((file) => {
        combinedDiff += `diff --git a/${file.path} b/${file.path}\n`;
        combinedDiff += `@@ File too large to display (${file.changes} changes) @@\n\n`;
      });
    }

    // Get diff for normal files
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
   * Abstract method: Get complete diff
   * To be implemented by subclasses
   */
  protected abstract getFullDiff(prUrl: string): Promise<string>;

  /**
   * Abstract method: Get diff for normal-sized files
   * To be implemented by subclasses
   */
  protected abstract getNormalFilesDiff(
    prUrl: string,
    files: GitHubFileChange[]
  ): Promise<string>;

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
