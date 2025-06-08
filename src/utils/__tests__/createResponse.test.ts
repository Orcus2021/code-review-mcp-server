import { describe, it, expect } from '@jest/globals';
import { createResponse, createErrorResponse } from '../createResponse';

describe('createResponse', () => {
  it('should create response with content', () => {
    const result = createResponse('test content');

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'test content',
        },
      ],
    });
  });

  it('should handle empty string content', () => {
    const result = createResponse('');

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: '',
        },
      ],
    });
  });

  it('should handle multiline content', () => {
    const multilineContent = 'Line 1\nLine 2\nLine 3';
    const result = createResponse(multilineContent);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: multilineContent,
        },
      ],
    });
  });
});

describe('createErrorResponse', () => {
  it('should create error response with formatted message', () => {
    const result = createErrorResponse('Something went wrong');

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Error: Something went wrong',
        },
      ],
    });
  });

  it('should handle empty error message', () => {
    const result = createErrorResponse('');

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Error: ',
        },
      ],
    });
  });

  it('should handle multiline error message', () => {
    const errorMessage = 'Line 1\nLine 2';
    const result = createErrorResponse(errorMessage);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
    });
  });
});
