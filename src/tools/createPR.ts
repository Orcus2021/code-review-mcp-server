import { z } from 'zod';
import { createResponse, createErrorResponse } from '../utils/createResponse.js';
import { createPR } from '../utils/githubProvider/index.js';
import {
  getGitRepoInfo,
  validateCurrentBranch,
  validateBaseBranch,
} from '../utils/getGitHandler.js';
import type { ToolResponse } from '../utils/createResponse.js';

/**
 * Create PR tool
 * - Creates a new GitHub Pull Request with auto-detection of git info
 */

export const createPRToolName = 'createPR';
export const createPRToolDescription =
  'Create a new GitHub Pull Request with specified title, body, and branches. Automatically detects GitHub URL and current branch from local git configuration.';

export const CreatePRToolSchema = z.object({
  folderPath: z.string().min(1, 'Folder path is required.'),
  githubUrl: z.string().url('A valid GitHub repository URL is required.').optional(),
  title: z.string().min(1, 'PR title is required.'),
  body: z.string().min(1, 'PR description is required.'),
  baseBranch: z.string().min(1, 'Base branch name is required.'),
  draft: z.boolean().optional().default(false),
});

type CreatePRArgs = z.infer<typeof CreatePRToolSchema>;

/**
 * Main function to create a new GitHub PR
 */
export async function runCreatePRTool(args: CreatePRArgs): Promise<ToolResponse> {
  const { folderPath, githubUrl, title, body, baseBranch, draft } = args;

  try {
    // 1. Reuse existing branch validation logic
    const currentBranchValidation = validateCurrentBranch(folderPath);
    if (!currentBranchValidation.isValid) {
      return createErrorResponse(currentBranchValidation.errorMessage);
    }
    const currentBranch = currentBranchValidation.data;

    const baseBranchValidation = validateBaseBranch(folderPath, baseBranch);
    if (!baseBranchValidation.isValid) {
      return createErrorResponse(baseBranchValidation.errorMessage);
    }

    // 2. Auto-detect git information
    const gitInfo = await getGitRepoInfo(folderPath);
    if (!gitInfo.isValid) {
      return createErrorResponse(`Failed to get git repository info: ${gitInfo.errorMessage}`);
    }

    // 3. Check if current branch is pushed to remote
    if (gitInfo.data.hasRemote && !gitInfo.data.isCurrentBranchPushed) {
      return createErrorResponse(
        `Current branch '${currentBranch}' has not been pushed to remote. ` +
          `Please push the branch first using: git push origin ${currentBranch}`,
      );
    }

    // 4. Use provided parameters or auto-detected values
    const repoUrl = githubUrl || gitInfo.data.repoUrl;

    // 5. Validate required information
    if (!repoUrl) {
      return createErrorResponse(
        'GitHub URL could not be determined. Please provide githubUrl parameter.',
      );
    }

    // 6. Call existing createPR function
    // Remove possible origin/ prefix for GitHub API compatibility
    const cleanBaseBranch = baseBranchValidation.data.replace(/^origin\//, '');

    const result = await createPR({
      repoUrl,
      title,
      body,
      baseBranch: cleanBaseBranch, // Use cleaned branch name
      currentBranch, // Use current branch
      draft,
    });

    if (!result.isValid) {
      return createErrorResponse(result.errorMessage!);
    }

    const draftStatus = draft ? ' (Draft)' : '';
    return createResponse(
      `PR created successfully!${draftStatus}\n\n` +
        `Repository: ${repoUrl}\n` +
        `Branch: ${currentBranch} → ${baseBranch}\n` +
        `Title: ${title}\n\n` +
        `Result: ${result.data}`,
    );
  } catch (error) {
    return createErrorResponse(
      `Error creating PR: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
