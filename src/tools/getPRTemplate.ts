import { z } from 'zod';
import { findAndReadTemplate } from '../utils/prTemplate.js';
import { createResponse, createErrorResponse } from '../utils/createResponse.js';
import type { ToolResponse } from '../utils/createResponse.js';

export const getPRTemplateToolName = 'getPRTemplate';
export const getPRTemplateToolDescription =
  'Read PR template from specified folder path and template name, returns template content or default template if not found';

export const GetPRTemplateToolSchema = z.object({
  folderPath: z.string().min(1, 'A folder path is required.'),
  templateName: z.string().optional(),
});

const HINT_MESSAGE = `Please follow the PR template exactly and do not add any additional information.`;
type GetPRTemplateArgs = z.infer<typeof GetPRTemplateToolSchema>;

/**
 * Execute PR template reading tool
 */
export async function runGetPRTemplateTool(args: GetPRTemplateArgs): Promise<ToolResponse> {
  const { folderPath, templateName } = args;

  try {
    // Search and read template file
    const result = await findAndReadTemplate(folderPath, templateName);

    if (result.found) {
      const message = `Found PR template at: ${result.filePath}\n\n${result.content}\n\n${HINT_MESSAGE}`;
      return createResponse(message);
    } else {
      const message = `No PR template found in folder: ${folderPath}\nUsing default template:\n\n${result.content}\n\n${HINT_MESSAGE}`;
      return createResponse(message);
    }
  } catch (error) {
    return createErrorResponse(
      `Error reading PR template: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
