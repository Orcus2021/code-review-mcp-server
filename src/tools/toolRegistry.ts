import type { ToolResponse } from '../utils/createResponse.js';
import type { JSONSchema7 } from 'json-schema';

import {
  codeReviewToolName,
  codeReviewToolDescription,
  CodeReviewToolSchema,
  runCodeReviewTool,
} from './codeReview.js';

import {
  codeReviewWithGithubUrlToolName,
  codeReviewWithGithubUrlToolDescription,
  CodeReviewWithGithubUrlToolSchema,
  runCodeReviewWithGithubUrlTool,
} from './codeReviewWithGithubUrl.js';

import {
  addPRSummaryCommentToolName,
  addPRSummaryCommentToolDescription,
  AddPRSummaryCommentToolSchema,
  runAddPRSummaryCommentTool,
} from './addPRSummaryComment.js';

import {
  addPRLineCommentToolName,
  addPRLineCommentToolDescription,
  AddPRLineCommentToolSchema,
  runAddPRLineCommentTool,
} from './addPRLineComment.js';

import {
  getPRTemplateToolName,
  getPRTemplateToolDescription,
  GetPRTemplateToolSchema,
  runGetPRTemplateTool,
} from './getPRTemplate.js';

import {
  createPRToolName,
  createPRToolDescription,
  CreatePRToolSchema,
  runCreatePRTool,
} from './createPR.js';

import {
  localGitDiffToolName,
  localGitDiffToolDescription,
  LocalGitDiffToolSchema,
  runLocalGitDiffTool,
} from './getLocalGitDiff.js';

/**
 * Tool registry interface for better type safety and maintainability
 */
interface ToolDefinition<T = unknown> {
  name: string;
  description: string;
  schema: JSONSchema7;
  handler: (args: T) => Promise<ToolResponse>;
}

/**
 * Centralized tool registry
 * Makes it easy to add new tools and maintain existing ones
 */
const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  [codeReviewToolName]: {
    name: codeReviewToolName,
    description: codeReviewToolDescription,
    schema: {
      type: 'object',
      properties: {
        folderPath: {
          type: 'string',
          description: 'Path to the full root directory of the repository to run git diff',
        },
        baseBranch: {
          type: 'string',
          description:
            'Name of the base branch to compare against the current branch (required). Specifies the reference point for diff comparison.',
        },
      },
      required: ['folderPath', 'baseBranch'],
    },
    handler: async (args) => {
      const validated = CodeReviewToolSchema.parse(args);
      return await runCodeReviewTool(validated);
    },
  },

  [localGitDiffToolName]: {
    name: localGitDiffToolName,
    description: localGitDiffToolDescription,
    schema: {
      type: 'object',
      properties: {
        folderPath: {
          type: 'string',
          description: 'Path to the full root directory of the repository to run git diff',
        },
        baseBranch: {
          type: 'string',
          description:
            'Name of the base branch to compare against the current branch (required). Specifies the reference point for diff comparison.',
        },
      },
      required: ['folderPath', 'baseBranch'],
    },
    handler: async (args) => {
      const validated = LocalGitDiffToolSchema.parse(args);
      return await runLocalGitDiffTool(validated);
    },
  },

  [codeReviewWithGithubUrlToolName]: {
    name: codeReviewWithGithubUrlToolName,
    description: codeReviewWithGithubUrlToolDescription,
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'A GitHub pull request URL to fetch the diff from (required).',
        },
      },
      required: ['url'],
    },
    handler: async (args) => {
      const validated = CodeReviewWithGithubUrlToolSchema.parse(args);
      return await runCodeReviewWithGithubUrlTool(validated);
    },
  },

  [addPRSummaryCommentToolName]: {
    name: addPRSummaryCommentToolName,
    description: addPRSummaryCommentToolDescription,
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'A GitHub pull request URL to add the comment to (required).',
        },
        commentMessage: {
          type: 'string',
          description: 'The comment message to add to the PR (required).',
        },
      },
      required: ['url', 'commentMessage'],
    },
    handler: async (args) => {
      const validated = AddPRSummaryCommentToolSchema.parse(args);
      return await runAddPRSummaryCommentTool(validated);
    },
  },

  [addPRLineCommentToolName]: {
    name: addPRLineCommentToolName,
    description: addPRLineCommentToolDescription,
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'A GitHub pull request URL to add the comments to (required).',
        },
        comments: {
          type: 'array',
          description:
            'Array of comments to add to specific lines in the PR (required). (Array<{filePath: string, line: string, commentMessage: string}>)',
          items: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the file in the repository to comment on.',
              },
              line: {
                type: 'string',
                description:
                  'Integer representing the specific line number to add a comment to. Must be a line that has been changed in the PR diff. Line ranges (e.g., "4-6") are not supported by GitHub API',
              },
              commentMessage: {
                type: 'string',
                description: 'The comment message to add to the PR (required).',
              },
            },
            required: ['filePath', 'line', 'commentMessage'],
          },
        },
      },
      required: ['url', 'comments'],
    },
    handler: async (args) => {
      const validated = AddPRLineCommentToolSchema.parse(args);
      return await runAddPRLineCommentTool(validated);
    },
  },

  [getPRTemplateToolName]: {
    name: getPRTemplateToolName,
    description: getPRTemplateToolDescription,
    schema: {
      type: 'object',
      properties: {
        folderPath: {
          type: 'string',
          description: 'Path to the folder to search for PR template files',
        },
        templateName: {
          type: 'string',
          description: 'Name of the template file (optional, defaults to pull_request_template.md)',
        },
      },
      required: ['folderPath'],
    },
    handler: async (args) => {
      const validated = GetPRTemplateToolSchema.parse(args);
      return await runGetPRTemplateTool(validated);
    },
  },

  [createPRToolName]: {
    name: createPRToolName,
    description: createPRToolDescription,
    schema: {
      type: 'object',
      properties: {
        folderPath: {
          type: 'string',
          description: 'Path to the git repository folder',
        },
        githubUrl: {
          type: 'string',
          description: 'GitHub repository URL (optional, auto-detected if not provided)',
        },
        title: {
          type: 'string',
          description: 'PR title',
        },
        body: {
          type: 'string',
          description: 'PR description/body',
        },
        baseBranch: {
          type: 'string',
          description: 'Target branch for the PR',
        },
        draft: {
          type: 'boolean',
          description: 'Whether to create as draft PR (optional, defaults to false)',
        },
      },
      required: ['folderPath', 'title', 'body', 'baseBranch'],
    },
    handler: async (args) => {
      const validated = CreatePRToolSchema.parse(args);
      return await runCreatePRTool(validated);
    },
  },
};

/**
 * Get all registered tools as an array for MCP server
 */
export function getRegisteredTools() {
  return Object.values(TOOL_REGISTRY).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.schema,
  }));
}

/**
 * Get a specific tool by name
 */
export function getTool(toolName: string): ToolDefinition | undefined {
  return TOOL_REGISTRY[toolName];
}

/**
 * Get all tool names
 */
export function getToolNames(): string[] {
  return Object.keys(TOOL_REGISTRY);
}
