import { Octokit } from "@octokit/rest";
import { BaseGitHubDiffProvider } from "./baseProvider.js";
import { getPRNumberFromUrl, getRepoInfoFromUrl } from "../parseGithubUrl.js";
import { formatGitDiffOutput } from "../formatDiff.js";
import type { GitHubFileChange } from "../../types/githubProvider.js";
import { addPrefixForComment } from "../formatComment.js";

interface GraphQLResponse {
  repository: {
    pullRequest: {
      files: {
        nodes: Array<{
          path: string;
          additions: number;
          deletions: number;
        }>;
      };
    };
  };
}

/**
 * GitHub Diff Provider implemented with RESTful API
 * Uses Octokit to fetch PR diff via GitHub API
 */
export class RestfulGitHubDiffProvider extends BaseGitHubDiffProvider {
  private octokit: Octokit;

  constructor(githubToken: string) {
    super();
    
    if (!githubToken) {
      throw new Error("GitHub token not provided");
    }

    this.octokit = new Octokit({ auth: githubToken });
  }

  /**
   * Get the list of changed files using the GraphQL API
   */
  protected async getFilesList(prUrl: string): Promise<GitHubFileChange[]> {
    try {
      const { owner, repo } = getRepoInfoFromUrl(prUrl);
      const prNumber = getPRNumberFromUrl(prUrl);

      const query = `
        query($owner: String!, $repo: String!, $prNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $prNumber) {
              files(first: 100) {
                nodes {
                  path
                  additions
                  deletions
                }
              }
            }
          }
        }
      `;

      const result = await this.octokit.graphql<GraphQLResponse>(query, {
        owner,
        repo,
        prNumber: Number(prNumber)
      });

      const files = result.repository.pullRequest.files.nodes;
      
      return files.map(({ path, additions, deletions }) => ({
        path,
        changes: additions + deletions
      }));
    } catch (error) {
      console.error("Error fetching PR files:", error);
      throw error;
    }
  }

  /**
   * Get the full diff using the REST API
   */
  protected async getFullDiff(prUrl: string): Promise<string> {
    try {
      const { owner, repo } = getRepoInfoFromUrl(prUrl);
      const prNumber = getPRNumberFromUrl(prUrl);

      const response = await this.octokit.request(
        `GET /repos/{owner}/{repo}/pulls/{pull_number}`,
        {
          owner,
          repo,
          pull_number: Number(prNumber),
          headers: {
            accept: "application/vnd.github.v3.diff"
          }
        }
      );

      // When requesting with the diff media type, the response is a string
      return response.data as unknown as string;
    } catch (error) {
      console.error("Error fetching full diff:", error);
      throw error;
    }
  }

  /**
   * Get the diff for normal-sized files using the REST API
   */
  protected async getNormalFilesDiff(
    prUrl: string,
    files: GitHubFileChange[]
  ): Promise<string> {
    try {
      const { owner, repo } = getRepoInfoFromUrl(prUrl);
      const prNumber = getPRNumberFromUrl(prUrl);
      let combinedDiff = "";

      const { data: prFiles } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: Number(prNumber),
        per_page: 100
      });

      for (const file of files) {
        const fileData = prFiles.find(f => f.filename === file.path);

        if (fileData && fileData.patch) {
          combinedDiff += formatGitDiffOutput(file.path, fileData.patch);
        }
      }

      return combinedDiff;
    } catch (error) {
      console.error("Error fetching normal files diff:", error);
      throw error;
    }
  }

  /**
   * Use REST API to add PR summary comment
   */
  protected async postPRSummaryComment({prUrl, commentMessage}: {prUrl: string, commentMessage: string}): Promise<string> {
    try {
      const { owner, repo } = getRepoInfoFromUrl(prUrl);
      const prNumber = getPRNumberFromUrl(prUrl);
      const formattedComment = addPrefixForComment(commentMessage);

      await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: Number(prNumber),
        body: formattedComment
      });
      
      return "Comment added successfully";
    } catch (error) {
      console.error("Error adding PR comment:", error);
      throw error;
    }
  }

  /**
   * Use REST API to add PR line comment
   */
  protected async postPRLineComment({prUrl, filePath, line, commentMessage}: {prUrl: string, filePath: string, line: number, commentMessage: string}): Promise<string> {
    try {
      const { owner, repo } = getRepoInfoFromUrl(prUrl);
      const prNumber = getPRNumberFromUrl(prUrl);
      
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: Number(prNumber)
      });
      
      const commitId = pr.head.sha;
      const formattedComment = addPrefixForComment(commentMessage);

      await this.octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number: Number(prNumber),
        body: formattedComment,
        commit_id: commitId,
        path: filePath,
        line: line,
        side: 'RIGHT'
      });
      
      return "Line comment added successfully";
    } catch (error) {
      console.error("Error adding PR line comment:", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
} 