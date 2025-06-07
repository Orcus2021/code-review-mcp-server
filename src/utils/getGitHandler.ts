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

interface GitRepoInfo {
  repoUrl?: string; // GitHub HTTPS URL
  currentBranch?: string; // 當前分支名稱
  isGitRepo: boolean; // 是否為 git 倉庫
  hasRemote: boolean; // 是否有 origin 遠程
  isCurrentBranchPushed: boolean; // 當前分支是否已推送到遠程
}

/**
 * 從指定目錄獲取 git 倉庫信息
 * 整合自 gitUtils.ts
 */
export async function getGitRepoInfo(folderPath: string): Promise<ValidationResult<GitRepoInfo>> {
  try {
    // 1. 驗證是否為 git 倉庫
    const isGitRepo = checkIsGitRepo(folderPath);
    if (!isGitRepo) {
      return {
        isValid: false,
        errorMessage: `Not a git repository: ${folderPath}`,
      };
    }

    // 2. 獲取當前分支 (重用現有函數)
    const currentBranch = getCurrentBranch(folderPath);

    // 3. 獲取遠程 URL
    const remoteUrl = getRemoteUrl(folderPath);
    const hasRemote = !!remoteUrl;

    // 4. 檢查當前分支是否已推送到遠程
    let isCurrentBranchPushed = hasRemote
      ? checkBranchPushedToRemote(folderPath, currentBranch)
      : false;

    // 5. 如果分支未推送，自動推送
    if (hasRemote && !isCurrentBranchPushed) {
      const pushResult = await autoPushCurrentBranch(folderPath, currentBranch);
      if (pushResult.isValid) {
        isCurrentBranchPushed = true;
      } else {
        return {
          isValid: false,
          errorMessage: `Failed to push current branch: ${pushResult.errorMessage}`,
        };
      }
    }

    // 6. 轉換為 GitHub HTTPS URL
    const repoUrl = remoteUrl ? convertGitUrlToHttps(remoteUrl) : undefined;

    return {
      isValid: true,
      data: {
        repoUrl,
        currentBranch,
        isGitRepo: true,
        hasRemote,
        isCurrentBranchPushed,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error getting git info: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 檢查是否為 git 倉庫
 */
function checkIsGitRepo(folderPath: string): boolean {
  try {
    execSync(`git -C "${folderPath}" rev-parse --is-inside-work-tree`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 檢查分支是否已推送到遠程
 */
function checkBranchPushedToRemote(folderPath: string, branchName: string): boolean {
  try {
    // 檢查遠程分支是否存在
    const remoteBranches = execSync(
      `git -C "${folderPath}" branch -r --list "origin/${branchName}"`,
      {
        encoding: 'utf-8',
      },
    ).trim();

    if (!remoteBranches) {
      return false;
    }

    // 檢查本地分支和遠程分支是否同步
    const localCommit = execSync(`git -C "${folderPath}" rev-parse ${branchName}`, {
      encoding: 'utf-8',
    }).trim();

    const remoteCommit = execSync(`git -C "${folderPath}" rev-parse origin/${branchName}`, {
      encoding: 'utf-8',
    }).trim();

    return localCommit === remoteCommit;
  } catch {
    return false;
  }
}

/**
 * 獲取遠程 URL
 */
function getRemoteUrl(folderPath: string): string | null {
  try {
    return execSync(`git -C "${folderPath}" remote get-url origin`, {
      encoding: 'utf-8',
    }).trim();
  } catch {
    return null;
  }
}

/**
 * 將 SSH URL 轉換為 HTTPS URL
 * git@github.com:user/repo.git → https://github.com/user/repo
 */
function convertGitUrlToHttps(gitUrl: string): string {
  // SSH format: git@github.com:user/repo.git
  if (gitUrl.startsWith('git@github.com:')) {
    const repoPath = gitUrl.replace('git@github.com:', '').replace('.git', '');
    return `https://github.com/${repoPath}`;
  }

  // HTTPS format: https://github.com/user/repo.git
  if (gitUrl.startsWith('https://github.com/')) {
    return gitUrl.replace('.git', '');
  }

  // Return as-is if not recognized format
  return gitUrl;
}

/**
 * 驗證是否為 GitHub URL
 */
export function isGitHubUrl(url: string): boolean {
  return url.includes('github.com');
}

/**
 * 自動推送當前分支到遠程
 */
async function autoPushCurrentBranch(
  folderPath: string,
  branchName: string,
): Promise<ValidationResult<string>> {
  try {
    console.warn(`Pushing branch '${branchName}' to remote...`);

    // 推送當前分支到遠程
    execSync(`git -C "${folderPath}" push origin ${branchName}`, {
      encoding: 'utf-8',
    });

    return {
      isValid: true,
      data: `Successfully pushed branch '${branchName}' to remote`,
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Failed to push branch '${branchName}': ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
