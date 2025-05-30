import { z } from 'zod';
import dotenv from 'dotenv';

import {
  validateCurrentBranch,
  validateBaseBranch,
  performGitDiff,
} from '../utils/getGitHandler.js';
import { getNotionContent } from '../utils/getNotionContent.js';
import { getInstructions } from '../utils/getInstructions.js';
import { getPromptOrFallback } from '../utils/getPromptOrFallback.js';
import { createResponse, createErrorResponse } from '../utils/createResponse.js';

import {
  STYLE_GUIDELINE_PROMPT,
  CODE_REVIEW_GUIDELINE_PROMPT,
} from '../constants/guidelinePrompt.js';
import type { ToolResponse } from '../utils/createResponse.js';

dotenv.config();

/**
 * Code Review tool
 * - Returns the diff along with instructions to review and fix issues
 */

export const codeReviewToolName = 'codeReview';
export const codeReviewToolDescription =
  'Run a git diff between branches. Requires a base branch name to compare against the current branch, and provide instructions to review/fix issues.';

export const CodeReviewToolSchema = z.object({
  folderPath: z.string().min(1, 'A folder path is required.'),
  baseBranch: z.string().min(1, 'A base branch name is required.'),
});

type CodeReviewArgs = z.infer<typeof CodeReviewToolSchema>;

/**
 * Main function to run the git branch diff tool
 */
export async function runCodeReviewTool(args: CodeReviewArgs): Promise<ToolResponse> {
  const { folderPath, baseBranch } = args;

  // Validate required parameters
  if (!baseBranch) {
    return createErrorResponse(
      "Please provide a base branch name using the 'baseBranch' parameter. This is required to perform a git diff operation.",
    );
  }

  // Validate git branch state
  const currentBranchResult = validateCurrentBranch(folderPath);
  if (!currentBranchResult.isValid) {
    return createErrorResponse(currentBranchResult.errorMessage!);
  }

  // Resolve base branch
  const baseBranchResult = validateBaseBranch(folderPath, baseBranch);
  if (!baseBranchResult.isValid) {
    return createErrorResponse(baseBranchResult.errorMessage!);
  }

  // Perform git diff
  const diffResult = performGitDiff(folderPath, baseBranchResult.data!, currentBranchResult.data!);
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

  const message = `Git Diff Output:\n${diffResult.data}\n\nReview Instructions:\n${instructions}`;

  return createResponse(message);
}
