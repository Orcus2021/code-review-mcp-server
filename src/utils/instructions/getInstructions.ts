import { getPromptOrFallback } from '../getPromptOrFallback.js';
import { getNotionContent } from '../getNotionContent.js';
import { readLocalMarkdownFile } from '../localFileUtils.js';
import { formatInstructions } from './formatInstructions.js';
import {
  STYLE_GUIDELINE_PROMPT,
  CODE_REVIEW_GUIDELINE_PROMPT,
} from '../../constants/guidelinePrompt.js';

/**
 * Get complete instructions with priority: local > notion > default
 */
export async function getInstructions({
  localInstructionsPath,
  styleGuidelineNotionUrl,
  codeReviewGuidelineNotionUrl,
}: {
  localInstructionsPath?: string;
  styleGuidelineNotionUrl?: string;
  codeReviewGuidelineNotionUrl?: string;
}): Promise<string> {
  // 1. Check local file first
  if (localInstructionsPath) {
    const localResult = await readLocalMarkdownFile(localInstructionsPath);
    if (localResult.isValid) {
      return localResult.data;
    }

    console.warn(`Failed to read local instructions file: ${localResult.errorMessage}`);
  }

  // 2. Fallback to existing logic: combine style + review guidelines
  const styleGuideline = await getPromptOrFallback({
    notionUrl: styleGuidelineNotionUrl,
    fallbackPrompt: STYLE_GUIDELINE_PROMPT,
    fetchPrompt: getNotionContent,
  });

  const codeReviewGuideline = await getPromptOrFallback({
    notionUrl: codeReviewGuidelineNotionUrl,
    fallbackPrompt: CODE_REVIEW_GUIDELINE_PROMPT,
    fetchPrompt: getNotionContent,
  });

  return formatInstructions({
    styleGuideline,
    codeReviewGuideline,
  });
}
