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

    // If not found locally, check remote repositories
    try {
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
      errorMessage: `Could not find branch '${baseBranch}'. Please check if the branch name is correct.`,
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
