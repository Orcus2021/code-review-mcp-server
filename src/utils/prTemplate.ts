import path from 'path';
import { readLocalMarkdownFile } from './localFileUtils.js';

// Default template content
const DEFAULT_TEMPLATE = `# Purpose
<!-- Briefly describe what this PR does -->

## Changes
<!-- List the main changes made in this PR -->
- 

## How to Review
<!-- Suggest where to start reviewing or what to focus on -->

## Notes
<!-- Any additional information, risks, or testing notes -->`;

export interface TemplateSearchResult {
  found: boolean;
  content: string;
  filePath?: string;
}

/**
 * Search and read PR template file
 */
export async function findAndReadTemplate(
  folderPath: string,
  templateName?: string,
): Promise<TemplateSearchResult> {
  const fileName = templateName || 'pull_request_template.md';

  // Search paths: directly in folder and .github subdirectory
  const searchPaths = [path.join(folderPath, fileName), path.join(folderPath, '.github', fileName)];

  for (const filePath of searchPaths) {
    const result = await readLocalMarkdownFile(filePath);
    if (result.isValid) {
      return {
        found: true,
        content: result.data,
        filePath,
      };
    }
  }

  // File not found, return default template
  return {
    found: false,
    content: DEFAULT_TEMPLATE,
  };
}

/**
 * Get default template
 */
export function getDefaultTemplate(): string {
  return DEFAULT_TEMPLATE;
}
