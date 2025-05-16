import dotenv from 'dotenv';
import { CliGitHubDiffProvider } from './cliProvider.js';
import { RestfulGitHubDiffProvider } from './restfulProvider.js';
import type { GitHubProvider } from '../../types/githubProvider.js';
import type { ValidationResult } from '../../types/validationResult.js';

dotenv.config();

let githubInstance: GitHubProvider | null = null;

function createGitHubDiffProvider(): GitHubProvider {
  const githubToken = process.env.GITHUB_TOKEN;

  if (githubInstance) {
    return githubInstance;
  }

  if (githubToken) {
    try {
      githubInstance = new RestfulGitHubDiffProvider(githubToken);
      return githubInstance;
    } catch (error) {
      console.warn(`Unable to create RESTful Provider: ${error}`);
      console.warn('Falling back to CLI Provider');
      githubInstance = new CliGitHubDiffProvider();
      return githubInstance;
    }
  }

  return new CliGitHubDiffProvider();
}

/**
 * Convenience method: Get GitHub PR diff
 * Create appropriate provider using factory and get diff
 */
export async function getGitHubPRDiff(prUrl: string): Promise<ValidationResult<string>> {
  if (!githubInstance) {
    githubInstance = createGitHubDiffProvider();
  }
  return await githubInstance.getPRDiff(prUrl);
}

/**
 * Convenience method: add PR summary comment
 * Use factory to create appropriate provider and add comment
 */
export async function addPRSummaryComment({
  prUrl,
  commentMessage,
}: {
  prUrl: string;
  commentMessage: string;
}): Promise<ValidationResult<string>> {
  const provider = createGitHubDiffProvider();
  return await provider.addPRSummaryComment({ prUrl, commentMessage });
}

/**
 * Convenience method: add PR line comment
 * Use factory to create appropriate provider and add line comment
 */
export async function addPRLineComment({
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
  const provider = createGitHubDiffProvider();
  return await provider.addPRLineComment({
    prUrl,
    filePath,
    line,
    commentMessage,
  });
}
