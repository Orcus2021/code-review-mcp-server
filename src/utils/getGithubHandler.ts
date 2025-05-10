import { getPRNumberFromUrl, getRepoInfoFromUrl } from "./parseGithubUrl.js";
import { execSync } from "child_process";
import type { ValidationResult } from "../types/validationResult.js";

const LARGE_FILE_THRESHOLD = 1000;
const getFilesFromGithub = (prUrl: string) => {
  const filesJson = execSync(
    `gh pr view ${prUrl} --json files --jq '.files | map({ path: .path, changes: (.additions + .deletions) })'`
  ).toString();
  return JSON.parse(filesJson) as Array<{
    path: string;
    changes: number;
  }>;
};
const getDiffFromFiles = (
  prUrl: string,
  files: Array<{ path: string; changes: number }>
) => {
  const { owner, repo } = getRepoInfoFromUrl(prUrl);
  const prNumber = getPRNumberFromUrl(prUrl);
  let combinedDiff = "";

  const largeFiles = files.filter(
    (file) => file.changes > LARGE_FILE_THRESHOLD
  );
  const normalFiles = files.filter(
    (file) => file.changes <= LARGE_FILE_THRESHOLD
  );

  if (largeFiles.length > 0) {
    combinedDiff += "Large files (changes > 1000) that were skipped:\n";
    largeFiles.forEach((file) => {
      combinedDiff += `diff --git a/${file.path} b/${file.path}\n`;
      combinedDiff += `@@ File too large to display (${file.changes} changes) @@\n\n`;
    });
  }

  for (const file of normalFiles) {
    const patch = execSync(
      `gh api repos/${owner}/${repo}/pulls/${prNumber}/files --jq '.[] | select(.filename == "${file.path}") | .patch'`
    ).toString();

    if (patch && patch.trim() !== "") {
      // A simple file header.
      combinedDiff += `diff --git a/${file.path} b/${file.path}\n`;
      // The patch from `gh api ... .patch` should contain the --- and +++ lines.
      combinedDiff += patch;
      // Ensure a newline separates patches from different files if not already present.
      if (!patch.endsWith("\n")) {
        combinedDiff += "\n";
      }
    }
  }

  return combinedDiff;
};

/**
 * Fetches diff content from a GitHub PR URL using gh CLI
 */
export function getGitHubPRDiff(prUrl: string): ValidationResult<string> {
  try {
    // Get file changes
    const files = getFilesFromGithub(prUrl);

    // Check if any file has more than 1000 changes
    const hasLargeFile = files.some(
      (file) => file.changes > LARGE_FILE_THRESHOLD
    );

    const diff = hasLargeFile
      ? getDiffFromFiles(prUrl, files)
      : execSync(`gh pr diff ${prUrl}`).toString();

    if (!diff || diff.trim() === "") {
      return {
        isValid: false,
        errorMessage:
          "No differences found in the pull request or invalid PR URL",
      };
    }

    return {
      isValid: true,
      data: diff,
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error fetching PR diff: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
