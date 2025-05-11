# Code Review MCP Tool

This tool is a Model Context Protocol (MCP) server that provides automated code review and leaves GitHub PR comments for any app that supports MCP integration.

## Features

- Compare code differences between two git branches
- Compare code differences from GitHub pull request URLs
- Add summary comments to GitHub pull requests
- Add line-specific comments to GitHub pull requests
- Provide detailed code review guidelines
- Support Notion integration to retrieve review guidelines from Notion code blocks, with default guidelines as fallback
- Include pre-configured style and code review guidelines

## Architecture

- **MCP Server**: Listens for code review requests from any MCP-compatible client app.
- **Git Integration**: Uses local git or GitHub PRs to generate diffs.
- **Notion Integration**: Fetches review guidelines from Notion code blocks if configured.
- **Automated Review**: Analyzes code diffs and generates review comments and suggestions.

## Prerequisites

- Node.js (v18 or above recommended)
- Git installed on your system
- For GitHub PR review, you must provide either:
  - a `GITHUB_TOKEN` environment variable (to use the GitHub RESTful API), **or**
  - have the GitHub CLI (`gh`) installed and authenticated
- (Optional) Notion API token for guideline integration

## MCP Configuration

To use this tool in any app that supports MCP, follow these steps:

1. Open the configuration file for your MCP-supported app.
2. Add the following configuration:

```json
{
  "mcpServers": {
    "code-review-tool": {
      "command": "npx",
      "args": ["-y", "code-review-mcp-server"],
      "env": {
        "GITHUB_TOKEN": "github_token",
        "NOTION_API_KEY": "notion_api_key",
        "NOTION_CODE_REVIEW_GUIDELINE_CODE_BLOCK_URL": "notion_code_block_url_here",
        "NOTION_STYLE_GUIDELINE_CODE_BLOCK_URL": "notion_code_block_url_here"
      }
    }
  }
}
```

## Notion Integration Setup

### 1. Request Notion API Token

1. Visit [Notion Developers](https://developers.notion.com/)
2. Create a new Integration
3. Obtain the API token

For detailed instructions, refer to: [Notion API Authorization Guide](https://developers.notion.com/docs/authorization#internal-integration-auth-flow-set-up)

### 2. Configure Environment Variables

The tool requires the following environment variables:

```
NOTION_API_KEY=your_token_here
NOTION_CODE_REVIEW_GUIDELINE_CODE_BLOCK_URL=your_notion_code_block_url
NOTION_STYLE_GUIDELINE_CODE_BLOCK_URL=your_notion_style_guideline_url
```

These can be provided in the `env` section of your MCP configuration as shown above.

### 3. Add Integration to Notion Page

1. Click the `Share` button on your Notion page
2. Add your Integration to the page's share list

Note: Currently only supports reading code blocks from Notion

For detailed instructions, refer to: [Notion API Connections Guide](https://www.notion.com/help/add-and-manage-connections-with-the-api)

## Usage

### Local Git Branch Review

In your MCP-compatible app, send the following command:

```
code review
base branch: branch/any_branch
```

This will:

1. Compare differences between the current branch and the specified base branch
2. Automatically generate a git diff
3. Perform a review based on style and code review guidelines
4. Provide detailed review results and improvement suggestions

### GitHub PR Review

In your MCP-compatible app, send the following command:

```
code review
https://github.com/owner/repo/pull/123

After generating the review report, please:

1.  Add PR summary comment
2.  Use **line comments** directly within the provided code to suggest specific improvements.
```

This will fetch the PR's diff, provide a code review, and leave PR comments directly on GitHub.

### CI Integration for Automated Code Review

You can automate code review in your CI pipeline by triggering an n8n webhook, which will call this project's MCP tool to perform the review and return results or leave comments on your PR.

For a step-by-step guide and recommended workflow diagram, see: [CI Integration with n8n and MCP Tool](./doc/ci-n8n-mcp-integration.md)

## Review Guidelines

This tool provides two default sets of guidelines:

1. **Style Guide**: Includes code style standards for variable naming, function naming, constant naming, etc.
2. **Code Review Guidelines**: Includes code quality standards based on SOLID principles, readability, immutability, etc.

You can also customize these guidelines through Notion integration.
