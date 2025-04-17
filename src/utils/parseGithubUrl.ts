/**
 * Gets the PR number from a GitHub PR URL
 */
export function getPRNumberFromUrl(url: string): string {
  const match = url.match(/\/pull\/(\d+)($|\/)/);
  if (!match) {
    throw new Error("Could not extract PR number from URL");
  }
  return match[1];
}

/**
 * Gets the repository owner and name from a GitHub PR URL
 */
export function getRepoInfoFromUrl(url: string): {
  owner: string;
  repo: string;
} {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error("Could not extract repository information from URL");
  }
  return { owner: match[1], repo: match[2] };
}
