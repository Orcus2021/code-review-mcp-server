import { describe, it, expect, jest } from '@jest/globals';
import { getPromptOrFallback } from '../getPromptOrFallback';
import type { ValidationResult } from '../../types/validationResult';

describe('getPromptOrFallback', () => {
  const fallbackPrompt = 'This is a fallback prompt';

  it('should return fallback prompt when notionUrl is not provided', async () => {
    const mockFetchPrompt = jest.fn<(notionUrl: string) => Promise<ValidationResult<string>>>();

    const result = await getPromptOrFallback({
      fallbackPrompt,
      fetchPrompt: mockFetchPrompt,
    });

    expect(result).toBe(fallbackPrompt);
    expect(mockFetchPrompt).not.toHaveBeenCalled();
  });

  it('should return fallback prompt when notionUrl is empty string', async () => {
    const mockFetchPrompt = jest.fn<(notionUrl: string) => Promise<ValidationResult<string>>>();

    const result = await getPromptOrFallback({
      notionUrl: '',
      fallbackPrompt,
      fetchPrompt: mockFetchPrompt,
    });

    expect(result).toBe(fallbackPrompt);
    expect(mockFetchPrompt).not.toHaveBeenCalled();
  });

  it('should return notion content when fetchPrompt returns valid result', async () => {
    const notionContent = 'Content from Notion';
    const validResult: ValidationResult<string> = {
      isValid: true,
      data: notionContent,
    };

    const mockFetchPrompt = jest
      .fn<(notionUrl: string) => Promise<ValidationResult<string>>>()
      .mockResolvedValue(validResult);

    const result = await getPromptOrFallback({
      notionUrl: 'https://notion.so/test',
      fallbackPrompt,
      fetchPrompt: mockFetchPrompt,
    });

    expect(result).toBe(notionContent);
    expect(mockFetchPrompt).toHaveBeenCalledWith('https://notion.so/test');
  });

  it('should return fallback prompt when fetchPrompt returns invalid result', async () => {
    const invalidResult: ValidationResult<string> = {
      isValid: false,
      errorMessage: 'Failed to fetch',
    };

    const mockFetchPrompt = jest
      .fn<(notionUrl: string) => Promise<ValidationResult<string>>>()
      .mockResolvedValue(invalidResult);

    const result = await getPromptOrFallback({
      notionUrl: 'https://notion.so/test',
      fallbackPrompt,
      fetchPrompt: mockFetchPrompt,
    });

    expect(result).toBe(fallbackPrompt);
    expect(mockFetchPrompt).toHaveBeenCalledWith('https://notion.so/test');
  });

  it('should return fallback prompt when fetchPrompt returns null', async () => {
    const mockFetchPrompt = jest
      .fn<(notionUrl: string) => Promise<ValidationResult<string>>>()
      .mockResolvedValue(null as any);

    const result = await getPromptOrFallback({
      notionUrl: 'https://notion.so/test',
      fallbackPrompt,
      fetchPrompt: mockFetchPrompt,
    });

    expect(result).toBe(fallbackPrompt);
    expect(mockFetchPrompt).toHaveBeenCalledWith('https://notion.so/test');
  });

  it('should return fallback prompt when fetchPrompt throws error', async () => {
    const mockFetchPrompt = jest
      .fn<(notionUrl: string) => Promise<ValidationResult<string>>>()
      .mockRejectedValue(new Error('Network error'));

    await expect(
      getPromptOrFallback({
        notionUrl: 'https://notion.so/test',
        fallbackPrompt,
        fetchPrompt: mockFetchPrompt,
      }),
    ).rejects.toThrow('Network error');

    expect(mockFetchPrompt).toHaveBeenCalledWith('https://notion.so/test');
  });
});
