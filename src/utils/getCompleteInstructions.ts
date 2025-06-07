import { readLocalMarkdownFile } from './localFileUtils.js';
import { getPromptOrFallback } from './getPromptOrFallback.js';
import { getNotionContent } from './getNotionContent.js';
import { getInstructions } from './getInstructions.js';
import {
  STYLE_GUIDELINE_PROMPT,
  CODE_REVIEW_GUIDELINE_PROMPT,
} from '../constants/guidelinePrompt.js';

/**
 * Get complete instructions with priority: local > notion > default
 */
export async function getCompleteInstructions({
  localInstructionsPath,
  styleGuidelineNotionUrl,
  codeReviewGuidelineNotionUrl,
}: {
  localInstructionsPath?: string;
  styleGuidelineNotionUrl?: string;
  codeReviewGuidelineNotionUrl?: string;
}): Promise<string> {
  // 1. 優先檢查本地檔案
  if (localInstructionsPath) {
    const localResult = await readLocalMarkdownFile(localInstructionsPath);
    if (localResult.isValid) {
      return localResult.data; // 完全替代整個指令
    }
    // Log warning but continue to fallback
    console.warn(`Failed to read local instructions file: ${localResult.errorMessage}`);
  }

  // 2. 回退到現有邏輯：組合 style + review guidelines
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

  return getInstructions({
    styleGuideline,
    codeReviewGuideline,
  });
}
