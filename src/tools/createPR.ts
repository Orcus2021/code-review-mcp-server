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
});

type CreatePRArgs = z.infer<typeof CreatePRToolSchema>;

/**
 * Main function to create a new GitHub PR
 */
export async function runCreatePRTool(args: CreatePRArgs): Promise<ToolResponse> {
  const { folderPath, githubUrl, title, body, baseBranch } = args;

  try {
    // 1. 重用現有的分支驗證邏輯
    const currentBranchValidation = validateCurrentBranch(folderPath);
    if (!currentBranchValidation.isValid) {
      return createErrorResponse(currentBranchValidation.errorMessage);
    }
    const currentBranch = currentBranchValidation.data;

    const baseBranchValidation = validateBaseBranch(folderPath, baseBranch);
    if (!baseBranchValidation.isValid) {
      return createErrorResponse(baseBranchValidation.errorMessage);
    }

    // 2. 自動檢測 git 信息
    const gitInfo = await getGitRepoInfo(folderPath);
    if (!gitInfo.isValid) {
      return createErrorResponse(`Failed to get git repository info: ${gitInfo.errorMessage}`);
    }

    // 3. 自動推送分支到遠程（如果需要的話）
    // getGitRepoInfo 已經處理了自動推送邏輯

    // 4. 使用提供的參數或自動檢測的值
    const repoUrl = githubUrl || gitInfo.data.repoUrl;

    // 5. 驗證必要信息
    if (!repoUrl) {
      return createErrorResponse(
        'GitHub URL could not be determined. Please provide githubUrl parameter.',
      );
    }

    // 6. 調用現有的 createPR 函數
    const result = await createPR({
      repoUrl,
      title,
      body,
      baseBranch: baseBranchValidation.data, // 使用驗證後的分支名
      currentBranch, // 使用當前分支
    });

    if (!result.isValid) {
      return createErrorResponse(result.errorMessage!);
    }

    return createResponse(
      `PR created successfully!\n\n` +
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
