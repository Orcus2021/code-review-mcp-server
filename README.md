# Code Review MCP Tool for Cursor

This tool is a Cursor plugin based on the Model Context Protocol (MCP) that automatically generates git diffs and performs code reviews within Cursor.

## Features

- Compare code differences between two git branches
- Provide detailed code review guidelines
- Support Notion integration to retrieve review guidelines from Notion code blocks, with default guidelines as fallback
- Include pre-configured style and code review guidelines

## Cursor Configuration

To use this tool in Cursor, you need to add the following configuration to your Cursor settings:

1. Open Cursor settings (typically located at `~/.cursor/config.json`)
2. Add the following configuration:

```json
{
  "mcpServers": {
    "code-review-tool": {
      "command": "npx",
      "args": ["-y", "code-review-mcp-server"],
      "env": {
        "NOTION_API_KEY": "notion_api_key",
        "NOTION_CODE_REVIEW_GUIDELINE_CODE_BLOCK_URL": "notion_code_block_url_here",
        "NOTION_STYLE_GUIDELINE_CODE_BLOCK_URL": "notion_code_block_url_here"
      }
    }
  }
}
```

### Enhancing AI Tool Usage with Cursor Rules

For optimal integration with Cursor's AI assistant, we recommend adding the following rule to your Cursor Rules:

```
Tools
- Whenever the terms 'code review' and 'base branch' appear in the chat, utilize the codeReview MCP tool to generate a diff and associated instructions. Subsequently, use the generated diff and instructions to conduct a thorough code review of the files of the proposed changes.
```

This rule instructs the AI to automatically utilize the Code Review MCP tool when relevant keywords are detected in your conversations, significantly enhancing workflow efficiency.

Reference documentation: [Cursor Model Context Protocol](https://docs.cursor.com/context/model-context-protocol)

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

These can be provided in the `env` section of your Cursor configuration as shown above.

### 3. Add Integration to Notion Page

1. Click the `Share` button on your Notion page
2. Add your Integration to the page's share list

Note: Currently only supports reading code blocks from Notion

For detailed instructions, refer to: [Notion API Connections Guide](https://www.notion.com/help/add-and-manage-connections-with-the-api)

## Usage

In the Cursor chat window, enter the following command:

```
code review
base branch: branch/any_branch
```

This will:

1. Compare differences between the current branch and the specified base branch
2. Automatically generate a git diff
3. Perform a review based on style and code review guidelines
4. Provide detailed review results and improvement suggestions

## Review Guidelines

This tool provides two default sets of guidelines:

1. **Style Guide**: Includes code style standards for variable naming, function naming, constant naming, etc.
2. **Code Review Guidelines**: Includes code quality standards based on SOLID principles, readability, immutability, etc.

You can also customize these guidelines through Notion integration.
