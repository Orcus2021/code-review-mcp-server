import { execFileSync } from 'child_process';
import { BaseGitHubDiffProvider } from './baseProvider.js';
import { getPRNumberFromUrl, getRepoInfoFromUrl } from '../parseGithubUrl.js';
import { formatGitDiffOutput } from '../formatDiff.js';
import { addPrefixForComment } from '../formatComment.js';
import type { GitHubFileChange } from '../../types/githubProvider.js';

/**
 * CLI implementation of GitHub Diff Provider
 * Uses gh CLI commands to get PR diff
 */
export class CliGitHubDiffProvider extends BaseGitHubDiffProvider {
  /**
   * Use gh CLI to get list of file changes
   */
  protected async getFilesList(prUrl: string): Promise<GitHubFileChange[]> {
    try {
      const filesJson = execFileSync('gh', [
        'pr',
        'view',
        prUrl,
        '--json',
        'files',
        '--jq',
        '.files | map({ path: .path, changes: (.additions + .deletions) })',
      ]).toString();

      return JSON.parse(filesJson) as GitHubFileChange[];
    } catch (error) {
      console.error('Error fetching PR files:', error);
      throw error;
    }
  }

  /**
   * Use gh CLI to get diff for normal-sized files
   */
  protected async getNormalFilesDiff(prUrl: string, files: GitHubFileChange[]): Promise<string> {
    try {
      const { owner, repo } = getRepoInfoFromUrl(prUrl);
      const prNumber = getPRNumberFromUrl(prUrl);
      let combinedDiff = '';

      for (const file of files) {
        // JSON.stringify produces a valid jq string literal, so an attacker-controlled
        // filename cannot break out of the jq filter.
        const patch = execFileSync('gh', [
          'api',
          `repos/${owner}/${repo}/pulls/${prNumber}/files`,
          '--jq',
          `.[] | select(.filename == ${JSON.stringify(file.path)}) | .patch`,
        ]).toString();

        if (patch && patch.trim() !== '') {
          combinedDiff += formatGitDiffOutput(file.path, patch);
        }
      }

      return combinedDiff;
    } catch (error) {
      console.error('Error fetching normal files diff:', error);
      throw error;
    }
  }

  /**
   * Use gh CLI to add PR summary comment
   */
  protected async postPRSummaryComment({
    prUrl,
    commentMessage,
  }: {
    prUrl: string;
    commentMessage: string;
  }): Promise<string> {
    try {
      const { owner, repo } = getRepoInfoFromUrl(prUrl);
      const prNumber = getPRNumberFromUrl(prUrl);
      const formattedComment = addPrefixForComment(commentMessage);

      // Use gh api to add comment
      execFileSync('gh', [
        'api',
        '-X',
        'POST',
        '-F',
        `body=${formattedComment}`,
        `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      ]);

      return 'Comment added successfully';
    } catch (error) {
      console.error(
        'Error adding PR comment:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Use gh CLI to add PR line comment
   */
  protected async postPRLineComment({
    prUrl,
    filePath,
    line,
    commentMessage,
  }: {
    prUrl: string;
    filePath: string;
    line: number;
    commentMessage: string;
  }): Promise<string> {
    try {
      const { owner, repo } = getRepoInfoFromUrl(prUrl);
      const prNumber = getPRNumberFromUrl(prUrl);
      const commitId = execFileSync('gh', [
        'api',
        `repos/${owner}/${repo}/pulls/${prNumber}`,
        '--jq',
        '.head.sha',
      ])
        .toString()
        .trim();

      const formattedComment = addPrefixForComment(commentMessage);

      // Use gh api to add line comment
      execFileSync('gh', [
        'api',
        '-X',
        'POST',
        '-F',
        `body=${formattedComment}`,
        '-F',
        `commit_id=${commitId}`,
        '-F',
        `path=${filePath}`,
        '-F',
        `line=${line}`,
        `/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
      ]);

      return 'Line comment added successfully';
    } catch (error) {
      console.error(
        'Error adding PR line comment:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Create a new PR using gh CLI
   */
  protected async createPRImplementation({
    owner,
    repo,
    title,
    body,
    baseBranch,
    currentBranch,
    draft,
    milestone,
  }: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    baseBranch: string;
    currentBranch: string;
    draft: boolean;
    milestone?: string;
  }): Promise<string> {
    try {
      // Build gh CLI args with optional --draft flag
      const args = [
        'pr',
        'create',
        '--repo',
        `${owner}/${repo}`,
        '--title',
        title,
        '--body',
        body,
        '--base',
        baseBranch,
        '--head',
        currentBranch,
      ];

      if (draft) {
        args.push('--draft');
      }

      if (milestone) {
        args.push('--milestone', milestone);
      }

      const result = execFileSync('gh', args).toString();
      return result.trim();
    } catch (error) {
      console.error('Error creating PR:', error);
      throw error;
    }
  }
}
