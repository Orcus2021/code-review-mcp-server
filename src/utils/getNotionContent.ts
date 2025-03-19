import { Client } from "@notionhq/client";
import type { ValidationResult } from "../types/validationResult.js";

import dotenv from "dotenv";

dotenv.config();

interface CodeBlock {
  type: "code";
  code: {
    rich_text: Array<{ plain_text: string }>;
  };
}

function extractBlockId(notionUrl: string) {
  // Match patterns like:
  // https://www.notion.so/page-1259537453ca800b9a9ae9b8b56caa35?pvs=4#1259537453ca800392d9d73eb62996ad
  // "1259537453ca800392d9d73eb62996ad" is the block id

  const hashIndex = notionUrl.indexOf("#");
  if (hashIndex > -1) {
    const hashPart = notionUrl.substring(hashIndex + 1);
    const uuidMatch = hashPart.match(/([a-f0-9]{32})/i);
    if (uuidMatch) return uuidMatch[0];
  }

  throw new Error("Could not extract a valid Notion block ID from the URL");
}

function isCodeBlock(block: unknown): block is CodeBlock {
  return (
    typeof block === "object" &&
    block !== null &&
    "code" in block &&
    typeof block.code === "object" &&
    block.code !== null &&
    "rich_text" in block.code &&
    Array.isArray(block.code.rich_text)
  );
}

export async function getNotionContent(
  notionUrl: string
): Promise<ValidationResult<string>> {
  const notionApiKey = process.env.NOTION_API_KEY;

  try {
    // Validate that the URL is from Notion
    if (!notionUrl?.includes("notion.so")) {
      return {
        isValid: false,
        errorMessage:
          "Error: The provided URL is not a valid Notion URL. Please provide a URL from notion.so domain.",
      };
    }

    if (!notionApiKey) {
      return {
        isValid: false,
        errorMessage:
          "Error: Notion API key not found in environment variables. Please set NOTION_API_KEY in your .env file.",
      };
    }

    const notion = new Client({
      auth: notionApiKey,
    });

    // Extract the block ID from the URL
    const blockId = extractBlockId(notionUrl);

    // Retrieve the block
    const response = await notion.blocks.retrieve({ block_id: blockId });

    if (isCodeBlock(response) && response.code.rich_text.length > 0) {
      const content = response.code.rich_text[0].plain_text;

      return {
        isValid: true,
        data: content,
      };
    } else {
      return {
        isValid: false,
        errorMessage: `Error: The block does not contain code with rich text content: ${JSON.stringify(
          response
        )}`,
      };
    }
  } catch (error: unknown) {
    return {
      isValid: false,
      errorMessage: `Error retrieving Notion content: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
