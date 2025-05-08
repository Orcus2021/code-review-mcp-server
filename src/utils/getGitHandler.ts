import { execSync } from "child_process";
import { ValidationResult } from "../types/validationResult.js";
import { getPRNumberFromUrl, getRepoInfoFromUrl } from "./parseGithubUrl.js";

export const getCurrentBranch = (folderPath: string) => {
  return execSync(`git -C "${folderPath}" rev-parse --abbrev-ref HEAD`, {
    encoding: "utf-8",
  }).trim();
};

export const getLocalBranches = ({
  folderPath,
  branchName,
}: {
  folderPath: string;
  branchName: string;
}) => {
  return execSync(`git -C "${folderPath}" branch --list "${branchName}"`, {
    encoding: "utf-8",
  }).trim();
};

export const fetchSpecificBranch = (
  folderPath: string,
  branchName: string
): boolean => {
  try {
    // Fetch the specific branch from origin
    execSync(`git -C "${folderPath}" fetch origin ${branchName}`, {
      encoding: "utf-8",
    });

    return true;
  } catch (error) {
    console.error(`Warning: Failed to fetch branch ${branchName}: ${error}`);
    return false;
  }
};

export const getRemoteBranches = ({
  folderPath,
  branchName,
}: {
  folderPath: string;
  branchName: string;
}) => {
  return execSync(`git -C "${folderPath}" branch -r --list "*/${branchName}"`, {
    encoding: "utf-8",
  }).trim();
};

export const getBranchDiff = ({
  folderPath,
  baseBranch,
  currentBranch,
}: {
  folderPath: string;
  baseBranch: string;
  currentBranch: string;
}) => {
  return execSync(
    `git -C "${folderPath}" diff ${baseBranch}..${currentBranch}`,
    {
      encoding: "utf-8",
    }
  );
};

export function validateCurrentBranch(
  folderPath: string
): ValidationResult<string> {
  try {
    const currentBranch = getCurrentBranch(folderPath);

    if (currentBranch === "HEAD") {
      return {
        isValid: false,
        errorMessage:
          "You are in detached HEAD state. Cannot perform git diff as branch information is missing.",
      };
    }

    return { isValid: true, data: currentBranch };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Failed to get current branch: ${error}`,
    };
  }
}

export function validateBaseBranch(
  folderPath: string,
  baseBranch: string
): ValidationResult<string> {
  try {
    // Check if the branch exists locally
    const localBranches = getLocalBranches({
      folderPath,
      branchName: baseBranch,
    });

    if (localBranches.length > 0) {
      return { isValid: true, data: baseBranch };
    }

    try {
      fetchSpecificBranch(folderPath, baseBranch);

      const remoteBranches = getRemoteBranches({
        folderPath,
        branchName: baseBranch,
      });

      if (remoteBranches.length > 0) {
        return {
          isValid: true,
          data: remoteBranches.split("\n")[0].trim(),
        };
      }
    } catch {
      // Ignore errors when checking remote branches
    }

    return {
      isValid: false,
      errorMessage: `Could not find base branch: '${baseBranch}'. Please check if the branch name is correct.`,
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error resolving base branch: ${error}`,
    };
  }
}

export function performGitDiff(
  folderPath: string,
  baseBranch: string,
  currentBranch: string
): ValidationResult<string> {
  try {
    const diffOutput = getBranchDiff({
      folderPath,
      baseBranch,
      currentBranch,
    });

    if (!diffOutput.trim()) {
      return {
        isValid: true,
        data: `No differences found between current branch (${currentBranch}) and base branch (${baseBranch}).`,
      };
    }

    return {
      isValid: true,
      data: `Comparing changes between current branch (${currentBranch}) and base branch (${baseBranch}):\n\n${diffOutput}`,
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error running git diff: ${error}`,
    };
  }
}

/**
 * Adds line numbers to the diff lines that start with + or -
 * @param diffContent The raw diff content from git diff command
 * @returns Formatted diff with line numbers
 */
export function formatDiffWithLineNumbers(diffContent: string): string {
  const lines = diffContent.split("\n");
  let lineNumberOld = 0;
  let lineNumberNew = 0;

  // Extract file headers and line numbers from the diff header
  const headerRegex = /^@@ -(\d+),\d+ \+(\d+),\d+ @@/;

  const formattedLines = lines.map((line) => {
    // If this is a diff header line, reset line counters
    const headerMatch = line.match(headerRegex);
    if (headerMatch) {
      lineNumberOld = parseInt(headerMatch[1], 10) - 1;
      lineNumberNew = parseInt(headerMatch[2], 10) - 1;
      return line;
    }

    // Handle normal diff lines
    if (line.startsWith("-")) {
      lineNumberOld++;
      return `Line: ${lineNumberOld} ${line}`;
    } else if (line.startsWith("+")) {
      lineNumberNew++;
      return `Line: ${lineNumberNew} ${line}`;
    } else if (line.startsWith(" ")) {
      // Context lines (unchanged)
      lineNumberOld++;
      lineNumberNew++;
      return line;
    }

    // Keep other lines unchanged (like file headers)
    return line;
  });

  return formattedLines.join("\n");
}

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
