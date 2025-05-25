import { z } from 'zod';
import { createResponse, createErrorResponse } from '../utils/createResponse.js';
import { createPR } from '../utils/githubProvider/index.js';
import type { ToolResponse } from '../utils/createResponse.js';

/**
 * Create PR tool
 * - Creates a new GitHub Pull Request
 */

export const createPRToolName = 'createPR';
export const createPRToolDescription =
  'Create a new GitHub Pull Request with specified title, body, and branches.';

export const CreatePRToolSchema = z.object({
  githubUrl: z.string().url('A valid GitHub repository URL is required.'),
  title: z.string().min(1, 'PR title is required.'),
  body: z
    .string()
    .min(
      1,
      'PR description is required. If .github/pull_request_template.md exists in the repository, follow that template. Otherwise, structure the description with sections: Purpose, Changes, and Notes.',
    ),
  baseBranch: z.string().min(1, 'Base branch name is required.'),
  currentBranch: z.string().min(1, 'Current branch name is required.'),
});

type CreatePRArgs = z.infer<typeof CreatePRToolSchema>;

/**
 * Main function to create a new GitHub PR
 */
export async function runCreatePRTool(args: CreatePRArgs): Promise<ToolResponse> {
  const { githubUrl, title, body, baseBranch, currentBranch } = args;

  try {
    const result = await createPR({
      repoUrl: githubUrl,
      title,
      body,
      baseBranch,
      currentBranch,
    });

    if (!result.isValid) {
      return createErrorResponse(result.errorMessage!);
    }

    return createResponse(result.data);
  } catch (error) {
    return createErrorResponse(
      `Error creating PR: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
