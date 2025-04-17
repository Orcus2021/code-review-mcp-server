import { execSync } from "child_process";
import { ValidationResult } from "../types/validationResult.js";

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

/**
 * Fetches diff content from a GitHub PR URL using gh CLI
 */
export function getGitHubPRDiff(prUrl: string): ValidationResult<string> {
  try {
    // Execute gh pr diff command
    const diff = execSync(`gh pr diff ${prUrl}`).toString();

    if (!diff || diff.trim() === "") {
      return {
        isValid: false,
        errorMessage:
          "No differences found in the pull request or invalid PR URL.",
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
