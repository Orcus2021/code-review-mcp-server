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
 * Get all possible PR template search paths according to GitHub documentation
 * Priority order (highest to lowest):
 * 1. .github/PULL_REQUEST_TEMPLATE/ directory (multiple templates)
 * 2. .github/pull_request_template.md (hidden directory)
 * 3. docs/pull_request_template.md (docs directory)
 * 4. pull_request_template.md (root directory)
 * 5. PULL_REQUEST_TEMPLATE/ directory in root (multiple templates)
 * 6. docs/PULL_REQUEST_TEMPLATE/ directory (multiple templates)
 */
function getTemplatePaths(folderPath: string, templateName?: string): string[] {
  const fileName = templateName || 'pull_request_template.md';

  return [
    // Priority 1: .github/PULL_REQUEST_TEMPLATE/ directory
    path.join(folderPath, '.github', 'PULL_REQUEST_TEMPLATE', fileName),

    // Priority 2: .github/ hidden directory
    path.join(folderPath, '.github', fileName),

    // Priority 3: docs/ directory
    path.join(folderPath, 'docs', fileName),

    // Priority 4: root directory
    path.join(folderPath, fileName),

    // Priority 5: PULL_REQUEST_TEMPLATE/ in root
    path.join(folderPath, 'PULL_REQUEST_TEMPLATE', fileName),

    // Priority 6: docs/PULL_REQUEST_TEMPLATE/ directory
    path.join(folderPath, 'docs', 'PULL_REQUEST_TEMPLATE', fileName),
  ];
}

/**
 * Search and read PR template file
 * Follows GitHub's standard template locations and priority order
 */
export async function findAndReadTemplate(
  folderPath: string,
  templateName?: string,
): Promise<TemplateSearchResult> {
  const searchPaths = getTemplatePaths(folderPath, templateName);

  // Search in priority order - return the first found template
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
