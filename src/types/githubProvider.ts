import type { ValidationResult } from './validationResult.js';

/**
 * GitHub file change info
 */
export interface GitHubFileChange {
  path: string;
  changes: number;
}

/**
 * GitHub Diff Provider interface
 * Defines methods for getting PR diff and adding comments
 */
export interface GitHubProvider {
  /**
   * Get GitHub PR diff
   * @param prUrl PR URL
   */
  getPRDiff(prUrl: string): Promise<ValidationResult<string>>;

  /**
   * Add summary comment in PR
   * @param prUrl PR URL
   * @param commentMessage Comment content
   */
  addPRSummaryComment({
    prUrl,
    commentMessage,
  }: {
    prUrl: string;
    commentMessage: string;
  }): Promise<ValidationResult<string>>;

  /**
   * Add comment to a specific line in PR
   * @param prUrl PR URL
   * @param filePath File path
   * @param line Line number
   * @param commentMessage Comment content
   */
  addPRLineComment({
    prUrl,
    filePath,
    line,
    commentMessage,
  }: {
    prUrl: string;
    filePath: string;
    line: number;
    commentMessage: string;
  }): Promise<ValidationResult<string>>;

  /**
   * Create a new PR
   * @param repoUrl Repository URL
   * @param title PR title
   * @param body PR description
   * @param baseBranch Target branch to merge into
   * @param currentBranch Source branch to merge from
   */
  createPR({
    repoUrl,
    title,
    body,
    baseBranch,
    currentBranch,
  }: {
    repoUrl: string;
    title: string;
    body: string;
    baseBranch: string;
    currentBranch: string;
  }): Promise<ValidationResult<string>>;
}
