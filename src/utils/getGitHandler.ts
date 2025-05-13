import { execSync } from 'child_process';
import {
  type FileChange,
  getIgnorePatterns,
  categorizeFiles,
  generateLargeFilesDiffMessage,
  generateChangeFilesList,
} from './fileUtils.js';
import { formatDiffWithLineNumbers } from './formatDiff.js';
import type { ValidationResult } from '../types/validationResult.js';

const getFileChanges = (
  folderPath: string,
  baseBranch: string,
  currentBranch: string,
): FileChange[] => {
  const numstatOutput = execSync(
    `git -C "${folderPath}" diff --numstat ${baseBranch}..${currentBranch}`,
    { encoding: 'utf-8' },
  ).trim();

  if (!numstatOutput) {
    return [];
  }

  return numstatOutput.split('\n').map((line) => {
    const [additions, deletions, path] = line.split('\t');
    return {
      path,
      additions: parseInt(additions, 10),
      deletions: parseInt(deletions, 10),
      changes: parseInt(additions, 10) + parseInt(deletions, 10),
    };
  });
};

export const getCurrentBranch = (folderPath: string) => {
  return execSync(`git -C "${folderPath}" rev-parse --abbrev-ref HEAD`, {
    encoding: 'utf-8',
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
    encoding: 'utf-8',
  }).trim();
};

export const fetchSpecificBranch = (folderPath: string, branchName: string): boolean => {
  try {
    // Fetch the specific branch from origin
    execSync(`git -C "${folderPath}" fetch origin ${branchName}`, {
      encoding: 'utf-8',
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
    encoding: 'utf-8',
  }).trim();
};

/**
 * Get diff for a single file
 */
const getFileDiff = (
  folderPath: string,
  baseBranch: string,
  currentBranch: string,
  filePath: string,
): string => {
  try {
    return execSync(
      `git -C "${folderPath}" diff ${baseBranch}..${currentBranch} -- "${filePath}"`,
      { encoding: 'utf-8' },
    );
  } catch (error) {
    console.warn(`Warning: Could not get diff for file ${filePath}: ${error}`);
    return '';
  }
};

/**
 * Get diff for all normal files
 */
const getNormalFilesDiff = (
  folderPath: string,
  baseBranch: string,
  currentBranch: string,
  normalFiles: FileChange[],
): string => {
  if (normalFiles.length === 0) {
    return '';
  }

  let combinedDiff = generateChangeFilesList(normalFiles);

  // Get the diff for each file individually to avoid path issues
  for (const file of normalFiles) {
    const fileDiff = getFileDiff(folderPath, baseBranch, currentBranch, file.path);
    combinedDiff += fileDiff;
  }

  return combinedDiff;
};

/**
 * Get branch diff with categorized files handling
 */
export const getBranchDiff = ({
  folderPath,
  baseBranch,
  currentBranch,
}: {
  folderPath: string;
  baseBranch: string;
  currentBranch: string;
}) => {
  // Get ignore patterns and file changes
  const ignorePatterns = getIgnorePatterns();
  const fileChanges = getFileChanges(folderPath, baseBranch, currentBranch);

  // Categorize files
  const { largeFiles, normalFiles } = categorizeFiles(fileChanges, ignorePatterns);

  // Generate diff for different file categories
  const largeFilesDiff = generateLargeFilesDiffMessage(largeFiles);
  const normalFilesDiff = getNormalFilesDiff(folderPath, baseBranch, currentBranch, normalFiles);

  // Combine all diffs
  return largeFilesDiff + normalFilesDiff;
};

export function validateCurrentBranch(folderPath: string): ValidationResult<string> {
  try {
    const currentBranch = getCurrentBranch(folderPath);

    if (currentBranch === 'HEAD') {
      return {
        isValid: false,
        errorMessage:
          'You are in detached HEAD state. Cannot perform git diff as branch information is missing.',
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
  baseBranch: string,
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
          data: remoteBranches.split('\n')[0].trim(),
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
  currentBranch: string,
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

    const formattedDiff = formatDiffWithLineNumbers(diffOutput);

    return {
      isValid: true,
      data: `Comparing changes between current branch (${currentBranch}) and base branch (${baseBranch}):\n\n${formattedDiff}`,
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error running git diff: ${error}`,
    };
  }
}
