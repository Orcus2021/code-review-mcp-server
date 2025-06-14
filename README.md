# Code Review MCP Tool

This tool is a Model Context Protocol (MCP) server that provides automated code review and leaves GitHub PR comments for any app that supports MCP integration.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Orcus2021/code-review-mcp-server)

## Features

- Compare code differences between two git branches
- Compare code differences from GitHub pull request URLs
- Add summary comments to GitHub pull requests
- Add line-specific comments to GitHub pull requests
- Provide detailed code review guidelines
- Support Notion integration to retrieve review guidelines from Notion code blocks, with default guidelines as fallback
- Support local markdown files for complete review instructions
- Include pre-configured style and code review guidelines
- Read PR templates from local directories
- Create GitHub Pull Requests with auto-detection of repository information
- Get raw git diff output without review instructions

## Tools

- **CodeReview**: Runs git diff between branch and base branch. Returns the diff along with instructions to review and fix issues.
- **GetLocalGitDiff**: Get git diff between two branches locally. Returns raw diff output without review instructions.
- **CodeReviewWithGithubUrl**: Fetches diff from a GitHub PR URL. Returns the diff along with instructions to review and fix issues.
- **AddPRSummaryComment**: Adds a summary comment to a GitHub PR.
- **AddPRLineComment**: Adds multiple comments to specific lines in a GitHub PR. Supports commenting on specific changed lines in the PR diff.
- **GetPRTemplate**: Read PR template from specified folder path and template name, returns template content or default template if not found.
- **CreatePR**: Create a new GitHub Pull Request with specified title, body, and branches. Automatically detects GitHub URL and current branch from local git configuration.

## Architecture

- **MCP Server**: Listens for code review requests from any MCP-compatible client app.
- **Git Integration**: Uses local git or GitHub PRs to generate diffs.
- **Notion Integration**: Fetches review guidelines from Notion code blocks if configured.
- **Local File Support**: Reads complete review instructions from local markdown files.
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
        "NOTION_STYLE_GUIDELINE_CODE_BLOCK_URL": "notion_code_block_url_here",
        "LOCAL_INSTRUCTIONS_FILE_PATH": "/path/to/complete-instructions.md",
        "IGNORE_PATTERNS": "pattern1,pattern2,pattern3"
      }
    }
  }
}
```

### Environment Variables Description

<table>
<thead>
<tr>
<th>Variable</th>
<th>Required</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>GITHUB_TOKEN</code></td>
<td>Optional</td>
<td>GitHub personal access token for API access. Falls back to GitHub CLI if not provided.</td>
</tr>
<tr>
<td><code>LOCAL_INSTRUCTIONS_FILE_PATH</code></td>
<td>Optional</td>
<td>Path to a local markdown file containing complete review instructions. When provided, this file completely replaces the combined Notion/default guidelines. Priority: Local > Notion > Default.</td>
</tr>
<tr>
<td><code>IGNORE_PATTERNS</code></td>
<td>Optional</td>
<td>Comma-separated glob patterns for files to exclude from review.</td>
</tr>
<tr>
<td colspan="3" align="center"><strong>Notion</strong></td>
</tr>
<tr>
<td><code>NOTION_API_KEY</code></td>
<td>Optional</td>
<td>Required for fetching review guidelines from Notion.</td>
</tr>
<tr>
<td><code>NOTION_CODE_REVIEW_GUIDELINE_CODE_BLOCK_URL</code></td>
<td>Optional</td>
<td>Notion URL containing code review guidelines. Must point to a Notion <code>&lt;/&gt; Code</code> block and requires valid <code>NOTION_API_KEY</code> to function. Falls back to default guidelines if not configured.</td>
</tr>
<tr>
<td><code>NOTION_STYLE_GUIDELINE_CODE_BLOCK_URL</code></td>
<td>Optional</td>
<td>Notion URL containing style guidelines. Must point to a Notion <code>&lt;/&gt; Code</code> block and requires valid <code>NOTION_API_KEY</code> to function. Falls back to default guidelines if not configured.</td>
</tr>
</tbody>
</table>

## Review Instructions Priority

The tool supports multiple sources for review instructions with the following priority order ([implementation](src/utils/instructions/getInstructions.ts)):

1. **Local Markdown File** (Highest Priority)

   - Set via `LOCAL_INSTRUCTIONS_FILE_PATH` environment variable
   - Must be a `.md` or `.markdown` file
   - Completely replaces all other instruction sources when available
   - Falls back to Notion/Default if file cannot be read

2. **Notion Integration** (Medium Priority)

   - Combines style guidelines and code review guidelines from Notion
   - Requires `NOTION_API_KEY` and respective URL environment variables

3. **Default Guidelines** (Lowest Priority)
   - Built-in style guide and code review guidelines
   - Always available as fallback

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

> **Tip**: For better review results, it's recommended to switch to the branch being reviewed before running the code review command.

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

### Get Raw Git Diff

To get only the git diff without review instructions:

```
get local git diff
base branch: main
```

This will return the raw git diff output between the current branch and the specified base branch, useful for further processing or analysis.

### GitHub PR Review

In your MCP-compatible app, send the following command:

```
code review
https://github.com/owner/repo/pull/123

After generating the review report, please:

1.  Add PR summary comment
2.  If individual files require suggested changes, use line comments.
```

This will fetch the PR's diff, provide a code review, and leave PR comments directly on GitHub.

### Create GitHub Pull Request

Create a PR with automatic repository detection:

```
create PR base on diff
base branch: main
```

The tool will:

- Automatically detect the GitHub repository URL from git remote
- Use the current branch as the source branch
- Verify that the current branch has been pushed to remote
- Create the PR using GitHub CLI or REST API

**Manual override** (if auto-detection fails):

```
create PR
github url: https://github.com/user/repo
base branch: main
```

### Read PR Template

Read PR templates from your repository:

```
get PR template
```

This will:

- Search for `pull_request_template.md` in the specified folder
- Also check `.github/` subdirectory
- Return the template content or a default template if not found

**Custom template name**:

```
get PR template
folder path: /path/to/your/repo/template
template name: custom_template.md
```

### CI Integration for Automated Code Review

You can automate code review in your CI pipeline by triggering an n8n webhook, which will call this project's MCP tool to perform the review and return results or leave comments on your PR.

For a step-by-step guide and recommended workflow diagram, see: [CI Integration with n8n and MCP Tool](./doc/ci-n8n-mcp-integration.md)

## Review Guidelines

This tool provides multiple ways to configure review guidelines:

### 1. Local Markdown Instructions (Recommended)

Create a complete instruction file in markdown format and set the `LOCAL_INSTRUCTIONS_FILE_PATH` environment variable. This provides the most flexibility and version control for your review process.

### 2. Notion Integration

Configure separate style and code review guidelines through Notion code blocks.

### 3. Default Guidelines

The tool includes built-in guidelines covering:

- **Style Guide**: Code style standards for variable naming, function naming, constant naming, etc.
- **Code Review Guidelines**: Code quality standards based on SOLID principles, readability, immutability, etc.
