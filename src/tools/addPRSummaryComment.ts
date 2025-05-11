import { z } from "zod";
import {
  createResponse,
  createErrorResponse,
} from "../utils/createResponse.js";
import { addPRSummaryComment } from "../utils/githubProvider/index.js";
import type { ToolResponse } from "../utils/createResponse.js";

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
 * Main function to add a summary comment to a GitHub PR
 */
export async function runAddPRSummaryCommentTool(
  args: AddPRSummaryCommentArgs
): Promise<ToolResponse> {
  const { url, commentMessage } = args;

  // Add comment to PR using the factory method
  const result = await addPRSummaryComment({
    prUrl: url,
    commentMessage,
  });
  
  if (!result.isValid) {
    return createErrorResponse(result.errorMessage!);
  }

  return createResponse(`Successfully added summary comment to PR: ${url}`);
}
