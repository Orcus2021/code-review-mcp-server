import { ValidationResult } from '../types/validationResult.js';

export async function getPromptOrFallback({
  notionUrl,
  fallbackPrompt,
  fetchPrompt,
}: {
  notionUrl?: string;
  fallbackPrompt: string;
  fetchPrompt: (notionUrl: string) => Promise<ValidationResult<string>>;
}): Promise<string> {
  if (!notionUrl) {
    return fallbackPrompt;
  }

  const notionContent = await fetchPrompt(notionUrl);

  return notionContent && notionContent.isValid ? notionContent.data : fallbackPrompt;
}
