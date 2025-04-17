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
 * Add PR Summary Comment tool
 * - Adds a summary comment to a GitHub PR
 */

export const addPRSummaryCommentToolName = "addPRSummaryComment";
export const addPRSummaryCommentToolDescription =
  "Add a summary comment to a GitHub pull request";

export const AddPRSummaryCommentToolSchema = z.object({
  url: z.string().url("A valid GitHub pull request URL is required."),
  commentMessage: z.string().min(1, "Comment message is required."),
});

type AddPRSummaryCommentArgs = z.infer<typeof AddPRSummaryCommentToolSchema>;

/**
 * Adds a summary comment to a GitHub PR using gh api
 * This does not depend on being in a git repository
 */
function addSummaryCommentToPR(
  url: string,
  commentMessage: string
): ValidationResult<string> {
  try {
    // Get PR number and repo info to use direct API call
    const prNumber = getPRNumberFromUrl(url);
    const { owner, repo } = getRepoInfoFromUrl(url);

    // Escape quotes and backticks in comment message
    const escapedComment = commentMessage
      .replace(/"/g, '\\"')
      .replace(/`/g, "\\`");

    // Use gh api to add comment
    execSync(
      `gh api -X POST -F body="${escapedComment}" /repos/${owner}/${repo}/issues/${prNumber}/comments`
    );

    return {
      isValid: true,
      data: "Comment added successfully",
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error adding comment to PR: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Main function to add a summary comment to a GitHub PR
 */
export async function runAddPRSummaryCommentTool(
  args: AddPRSummaryCommentArgs
): Promise<ToolResponse> {
  const { url, commentMessage } = args;

  // Validate required parameters
  if (!url || !commentMessage) {
    return createErrorResponse(
      "Both 'url' and 'commentMessage' parameters are required."
    );
  }

  // Add comment to PR
  const result = addSummaryCommentToPR(
    url,
    `🤖AI Review:\n\n${commentMessage}`
  );
  if (!result.isValid) {
    return createErrorResponse(result.errorMessage!);
  }

  return createResponse(`Successfully added summary comment to PR: ${url}`);
}
