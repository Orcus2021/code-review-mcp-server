import { z } from "zod";
import {
  createResponse,
  createErrorResponse,
} from "../utils/createResponse.js";
import type { ToolResponse } from "../utils/createResponse.js";
import { addPRLineComment } from "../utils/githubProvider/index.js";

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

/**
 * Main function to add multiple line comments to a GitHub PR
 */
export async function runAddPRLineCommentTool(
  args: AddPRLineCommentArgs
): Promise<ToolResponse> {
  const { url, comments } = args;

  try {
    // Add all comments
    const results = [];
    const errors = [];

    for (const comment of comments) {
      const result = await addPRLineComment({
        prUrl: url,
        filePath: comment.filePath,
        line: parseInt(comment.line),
        commentMessage: comment.commentMessage,
      });

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
