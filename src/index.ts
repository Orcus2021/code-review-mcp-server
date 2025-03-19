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

/**
 * CodeReview
 *  - Runs git diff between branch and base branch
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
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const validated = CodeReviewToolSchema.parse(request.params.arguments);
    return await runCodeReviewTool(validated);
  } catch (error) {
    throw new Error(`Unknown tool: ${codeReviewToolName}`);
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
