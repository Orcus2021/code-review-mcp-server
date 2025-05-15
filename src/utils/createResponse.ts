export type ToolResponse = { content: Array<{ type: string; text: string }> };
/**
 * Creates a text response for the tool output
 */
export function createResponse(message: string): ToolResponse {
  return {
    content: [{ type: 'text', text: message }],
  };
}

/**
 * Creates an error response with formatted message
 */
export function createErrorResponse(errorMessage: string): ToolResponse {
  return createResponse(`Error: ${errorMessage}`);
}
