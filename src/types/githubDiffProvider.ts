import type { ValidationResult } from "./validationResult.js";

/**
 * Information about GitHub file changes
 */
export interface GitHubFileChange {
  path: string;
  changes: number;
}

/**
 * GitHub Diff Provider interface
 */
export interface GitHubDiffProvider {
  getPRDiff(prUrl: string): Promise<ValidationResult<string>>;
} 