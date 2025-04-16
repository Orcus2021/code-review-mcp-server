#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  codeReviewToolName,
  codeReviewToolDescription,
  CodeReviewToolSchema,
  runCodeReviewTool,
} from "./tools/codeReview.js";

import {
  codeReviewWithGithubUrlToolName,
  codeReviewWithGithubUrlToolDescription,
  CodeReviewWithGithubUrlToolSchema,
  runCodeReviewWithGithubUrlTool,
} from "./tools/codeReviewWithGithubUrl.js";

/**
 * CodeReview
 *  - Runs git diff between branch and base branch
 *  - Returns the diff along with instructions to review and fix issues
 *
 * CodeReviewWithGithubUrl
 *  - Fetches diff from a GitHub PR URL
 *  - Returns the diff along with instructions to review and fix issues
 */

const server = new Server(
  {
    name: "code-review-tool",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: codeReviewToolName,
        description: codeReviewToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            folderPath: {
              type: "string",
              description:
                "Path to the full root directory of the repository to run git diff",
            },
            baseBranch: {
              type: "string",
              description:
                "Name of the base branch to compare against the current branch (required). Specifies the reference point for diff comparison.",
            },
          },
          required: ["folderPath", "baseBranch"],
        },
      },
      {
        name: codeReviewWithGithubUrlToolName,
        description: codeReviewWithGithubUrlToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description:
                "A GitHub pull request URL to fetch the diff from (required).",
            },
          },
          required: ["url"],
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
      const validated = CodeReviewWithGithubUrlToolSchema.parse(
        request.params.arguments
      );
      return await runCodeReviewWithGithubUrlTool(validated);
    } else {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    throw new Error(
      `Error handling tool call: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cursor Tools MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
