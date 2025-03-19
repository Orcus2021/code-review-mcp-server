declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NOTION_CODE_REVIEW_GUIDELINE_CODE_BLOCK_URL: string;
      NOTION_STYLE_GUIDELINE_CODE_BLOCK_URL: string;
      NOTION_API_KEY: string;
    }
  }
}

export {};
