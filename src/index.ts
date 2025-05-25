#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import {
  codeReviewToolName,
  codeReviewToolDescription,
  CodeReviewToolSchema,
  runCodeReviewTool,
} from './tools/codeReview.js';

import {
  codeReviewWithGithubUrlToolName,
  codeReviewWithGithubUrlToolDescription,
  CodeReviewWithGithubUrlToolSchema,
  runCodeReviewWithGithubUrlTool,
} from './tools/codeReviewWithGithubUrl.js';

import {
  addPRSummaryCommentToolName,
  addPRSummaryCommentToolDescription,
  AddPRSummaryCommentToolSchema,
  runAddPRSummaryCommentTool,
} from './tools/addPRSummaryComment.js';

import {
  addPRLineCommentToolName,
  addPRLineCommentToolDescription,
  AddPRLineCommentToolSchema,
  runAddPRLineCommentTool,
} from './tools/addPRLineComment.js';

import {
  createPRToolName,
  createPRToolDescription,
  CreatePRToolSchema,
  runCreatePRTool,
} from './tools/createPR.js';

import { createErrorResponse } from './utils/createResponse.js';

/**
 * CodeReview
 *  - Runs git diff between branch and base branch
 *  - Returns the diff along with instructions to review and fix issues
 *
 * CodeReviewWithGithubUrl
 *  - Fetches diff from a GitHub PR URL
 *  - Returns the diff along with instructions to review and fix issues
 *
 * AddPRSummaryComment
 *  - Adds a summary comment to a GitHub PR
 *
 * AddPRLineComment
 *  - Adds multiple comments to specific lines in a GitHub PR
 *
 * CreatePR
 *  - Creates a new GitHub Pull Request
 */

const server = new Server(
  {
    name: 'code-review-tool',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: codeReviewToolName,
        description: codeReviewToolDescription,
        inputSchema: {
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
      },
      {
        name: codeReviewWithGithubUrlToolName,
        description: codeReviewWithGithubUrlToolDescription,
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'A GitHub pull request URL to fetch the diff from (required).',
            },
          },
          required: ['url'],
        },
      },
      {
        name: addPRSummaryCommentToolName,
        description: addPRSummaryCommentToolDescription,
        inputSchema: {
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
      },
      {
        name: addPRLineCommentToolName,
        description: addPRLineCommentToolDescription,
        inputSchema: {
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
      },
      {
        name: createPRToolName,
        description: createPRToolDescription,
        inputSchema: {
          type: 'object',
          properties: {
            githubUrl: {
              type: 'string',
              description: 'A GitHub repository URL to create the PR in (required).',
            },
            title: {
              type: 'string',
              description: 'The title of the PR (required).',
            },
            body: {
              type: 'string',
              description:
                'The description/body of the PR (required). If ".github/pull_request_template.md" exists in the repository, follow that template. Otherwise, structure the description with sections: Purpose, Changes, and Notes.',
            },
            baseBranch: {
              type: 'string',
              description: 'The target branch to merge into (required).',
            },
            currentBranch: {
              type: 'string',
              description: 'The source branch containing the changes (required).',
            },
          },
          required: ['githubUrl', 'title', 'body', 'baseBranch', 'currentBranch'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === codeReviewToolName) {
      const validated = CodeReviewToolSchema.parse(request.params.arguments);
      return await runCodeReviewTool(validated);
    } else if (request.params.name === codeReviewWithGithubUrlToolName) {
      const validated = CodeReviewWithGithubUrlToolSchema.parse(request.params.arguments);
      return await runCodeReviewWithGithubUrlTool(validated);
    } else if (request.params.name === addPRSummaryCommentToolName) {
      const validated = AddPRSummaryCommentToolSchema.parse(request.params.arguments);
      return await runAddPRSummaryCommentTool(validated);
    } else if (request.params.name === addPRLineCommentToolName) {
      const validated = AddPRLineCommentToolSchema.parse(request.params.arguments);
      return await runAddPRLineCommentTool(validated);
    } else if (request.params.name === createPRToolName) {
      const validated = CreatePRToolSchema.parse(request.params.arguments);
      return await runCreatePRTool(validated);
    } else {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return createErrorResponse(
      `Error handling tool call: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('Cursor Tools MCP Server running on stdio');
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error}`);
  process.exit(1);
});
