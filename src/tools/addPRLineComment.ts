import { z } from "zod";
import { execSync } from "child_process";
import {
  createResponse,
  createErrorResponse,
} from "../utils/createResponse.js";
import {
  getPRNumberFromUrl,
  getRepoInfoFromUrl,
} from "../utils/parseGithubUrl.js";
import type { ToolResponse } from "../utils/createResponse.js";
import type { ValidationResult } from "../types/validationResult.js";

/**
 * Add PR Line Comments tool
 * - Adds multiple comments to specific lines in a GitHub PR
 */

export const addPRLineCommentToolName = "addPRLineComment";
export const addPRLineCommentToolDescription =
  "Add multiple comments to specific lines in a GitHub pull request";

// Define the structure for a single line comment
const LineCommentSchema = z.object({
  filePath: z.string().min(1, "File path is required."),
  line: z.string().or(z.number()).transform(String),
  commentMessage: z.string().min(1, "Comment message is required."),
});

export const AddPRLineCommentToolSchema = z.object({
  url: z.string().url("A valid GitHub pull request URL is required."),
  comments: z
    .array(LineCommentSchema)
    .min(1, "At least one comment is required."),
});

type AddPRLineCommentArgs = z.infer<typeof AddPRLineCommentToolSchema>;
type LineComment = z.infer<typeof LineCommentSchema>;

/**
 * Gets the commit ID for a GitHub PR using gh api
 * This does not rely on the local git repository
 */
function getCommitIdForPR(
  prNumber: string,
  owner: string,
  repo: string
): string {
  try {
    // Use gh api to get PR data directly
    const prData = execSync(
      `gh api /repos/${owner}/${repo}/pulls/${prNumber}`
    ).toString();

    const prJson = JSON.parse(prData);
    const headSha = prJson.head.sha;

    if (!headSha) {
      throw new Error("Could not find head commit SHA in PR data");
    }

    return headSha;
  } catch (error) {
    throw new Error(
      `Error getting commit ID: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Adds a line comment to a GitHub PR
 */
function addLineCommentToPR(
  prNumber: string,
  repoOwner: string,
  repoName: string,
  commitId: string,
  comment: LineComment
): ValidationResult<string> {
  try {
    // Escape quotes in comment message
    const escapedComment = comment.commentMessage
      .replace(/"/g, '\\"')
      .replace(/`/g, "\\`");

    // Execute gh api command to add comment
    const command = `gh api -X POST -F body="${escapedComment}" -F commit_id="${commitId}" -F path="${comment.filePath}" -F line=${comment.line} /repos/${repoOwner}/${repoName}/pulls/${prNumber}/comments`;

    execSync(command);

    return {
      isValid: true,
      data: `Line comment added successfully to ${comment.filePath}:${comment.line}`,
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error adding line comment to ${comment.filePath}:${
        comment.line
      }: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Main function to add multiple line comments to a GitHub PR
 */
export async function runAddPRLineCommentTool(
  args: AddPRLineCommentArgs
): Promise<ToolResponse> {
  const { url, comments } = args;

  try {
    // Get PR number and repo info
    const prNumber = getPRNumberFromUrl(url);
    const { owner, repo } = getRepoInfoFromUrl(url);

    // Get commit ID using direct API call
    const commitId = getCommitIdForPR(prNumber, owner, repo);

    // Add all comments
    const results = [];
    const errors = [];

    for (const comment of comments) {
      const aiReviewComment = `🤖AI Review:\n\n${comment.commentMessage}`;
      const mappedComment = {
        ...comment,
        commentMessage: aiReviewComment,
      };
      const result = addLineCommentToPR(
        prNumber,
        owner,
        repo,
        commitId,
        mappedComment
      );

      if (result.isValid) {
        results.push(result.data);
      } else {
        errors.push(result.errorMessage);
      }
    }

    // Report results
    if (errors.length > 0) {
      return createErrorResponse(
        `Error adding some comments: ${errors.join("; ")}`
      );
    }

    return createResponse(
      `Successfully added ${results.length} comments to PR: ${url}`
    );
  } catch (error) {
    return createErrorResponse(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
