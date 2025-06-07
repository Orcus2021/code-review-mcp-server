#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { getRegisteredTools, getTool } from './tools/toolRegistry.js';
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
 * GetPRTemplate
 *  - Read PR template from specified folder path and template name
 *  - Returns template content or default template if not found
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
    tools: getRegisteredTools(),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const toolName = request.params.name;
    const tool = getTool(toolName);

    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return await tool.handler(request.params.arguments);
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
