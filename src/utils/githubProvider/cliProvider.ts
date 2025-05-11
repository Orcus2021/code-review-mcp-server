import { execSync } from "child_process";
import { BaseGitHubDiffProvider } from "./baseProvider.js";
import { getPRNumberFromUrl, getRepoInfoFromUrl } from "../parseGithubUrl.js";
import { formatGitDiffOutput } from "../formatDiff.js";
import type { GitHubFileChange } from "../../types/githubProvider.js";

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
      const filesJson = execSync(
        `gh pr view ${prUrl} --json files --jq '.files | map({ path: .path, changes: (.additions + .deletions) })'`
      ).toString();
      
      return JSON.parse(filesJson) as GitHubFileChange[];
    } catch (error) {
      console.error("Error fetching PR files:", error);
      throw error;
    }
  }

  /**
   * Use gh CLI to get complete diff
   */
  protected async getFullDiff(prUrl: string): Promise<string> {
    try {
      return execSync(`gh pr diff ${prUrl}`).toString();
    } catch (error) {
      console.error("Error fetching full diff:", error);
      throw error;
    }
  }

  /**
   * Use gh CLI to get diff for normal-sized files
   */
  protected async getNormalFilesDiff(
    prUrl: string,
    files: GitHubFileChange[]
  ): Promise<string> {
    try {
      const { owner, repo } = getRepoInfoFromUrl(prUrl);
      const prNumber = getPRNumberFromUrl(prUrl);
      let combinedDiff = "";

      for (const file of files) {
        const patch = execSync(
          `gh api repos/${owner}/${repo}/pulls/${prNumber}/files --jq '.[] | select(.filename == "${file.path}") | .patch'`
        ).toString();

        if (patch && patch.trim() !== "") {
          combinedDiff += formatGitDiffOutput(file.path, patch);
        }
      }

      return combinedDiff;
    } catch (error) {
      console.error("Error fetching normal files diff:", error);
      throw error;
    }
  }
} 