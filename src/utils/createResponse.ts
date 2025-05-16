export type ToolResponse = { content: Array<{ type: string; text: string }> };

export type ErrorToolResponse = { isError: true; content: ToolResponse['content'] };
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
export function createErrorResponse(errorMessage: string): ErrorToolResponse {
  const errorResponse = createResponse(`Error: ${errorMessage}`);
  return {
    isError: true,
    ...errorResponse,
  };
}
