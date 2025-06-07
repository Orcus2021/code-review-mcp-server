import { z } from 'zod';
import {
  validateCurrentBranch,
  validateBaseBranch,
  performGitDiff,
} from '../utils/getGitHandler.js';
import { createResponse, createErrorResponse } from '../utils/createResponse.js';
import type { ToolResponse } from '../utils/createResponse.js';

/**
 * Local Git Diff tool
 * - Returns the raw git diff between two branches without review instructions
 */

export const localGitDiffToolName = 'getLocalGitDiff';
export const localGitDiffToolDescription =
  'Get git diff between two branches locally. Returns raw diff output without review instructions.';

export const LocalGitDiffToolSchema = z.object({
  folderPath: z.string().min(1, 'A folder path is required.'),
  baseBranch: z.string().min(1, 'A base branch name is required.'),
});

type LocalGitDiffArgs = z.infer<typeof LocalGitDiffToolSchema>;

/**
 * Main function to run the local git diff tool
 */
export async function runLocalGitDiffTool(args: LocalGitDiffArgs): Promise<ToolResponse> {
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

  // Return pure diff without instructions
  const message = `Git Diff Output:\n${diffResult.data}`;

  return createResponse(message);
}
