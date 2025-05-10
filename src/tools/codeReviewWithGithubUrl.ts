import { z } from "zod";
import dotenv from "dotenv";

import { getNotionContent } from "../utils/getNotionContent.js";
import { getInstructions } from "../utils/getInstructions.js";
import { getPromptOrFallback } from "../utils/getPromptOrFallback.js";
import {
  createResponse,
  createErrorResponse,
} from "../utils/createResponse.js";
import { formatDiffWithLineNumbers } from "../utils/formatDiff.js";
import { getGitHubPRDiff } from "../utils/getGithubHandler.js";

import {
  STYLE_GUIDELINE_PROMPT,
  CODE_REVIEW_GUIDELINE_PROMPT,
} from "../constants/guidelinePrompt.js";
import type { ToolResponse } from "../utils/createResponse.js";

dotenv.config();

/**
 * Code Review with GitHub URL tool
 * - Returns the diff from a GitHub PR URL along with instructions to review and fix issues
 */

export const codeReviewWithGithubUrlToolName = "codeReviewWithGithubUrl";
export const codeReviewWithGithubUrlToolDescription =
  "Run a git diff using a GitHub PR URL. Requires a GitHub pull request URL to fetch the diff, and provide instructions to review/fix issues.";

export const CodeReviewWithGithubUrlToolSchema = z.object({
  url: z.string().url("A valid GitHub pull request URL is required."),
});

type CodeReviewWithGithubUrlArgs = z.infer<
  typeof CodeReviewWithGithubUrlToolSchema
>;

/**
 * Main function to run the GitHub PR diff tool
 */
export async function runCodeReviewWithGithubUrlTool(
  args: CodeReviewWithGithubUrlArgs
): Promise<ToolResponse> {
  const { url } = args;

  // Validate required parameters
  if (!url) {
    return createErrorResponse(
      "Please provide a GitHub pull request URL using the 'url' parameter."
    );
  }

  // Get diff from GitHub PR
  const diffResult = getGitHubPRDiff(url);
  if (!diffResult.isValid) {
    return createErrorResponse(diffResult.errorMessage!);
  }

  const styleGuideline = await getPromptOrFallback({
    notionUrl: process.env.NOTION_STYLE_GUIDELINE_CODE_BLOCK_URL,
    fallbackPrompt: STYLE_GUIDELINE_PROMPT,
    fetchPrompt: getNotionContent,
  });

  const codeReviewGuideline = await getPromptOrFallback({
    notionUrl: process.env.NOTION_CODE_REVIEW_GUIDELINE_CODE_BLOCK_URL,
    fallbackPrompt: CODE_REVIEW_GUIDELINE_PROMPT,
    fetchPrompt: getNotionContent,
  });

  const instructions = getInstructions({
    styleGuideline,
    codeReviewGuideline,
  });
  const diff = formatDiffWithLineNumbers(diffResult.data!);
  const message = `GitHub PR Diff Output:\n${diff}\n\nReview Instructions:\n${instructions}`;

  return createResponse(message);
}
