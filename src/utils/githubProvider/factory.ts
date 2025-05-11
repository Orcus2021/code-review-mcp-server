import dotenv from "dotenv";
import { CliGitHubDiffProvider } from "./cliProvider.js";
import { RestfulGitHubDiffProvider } from "./restfulProvider.js";
import type { GitHubProvider } from "../../types/githubProvider.js";
import type { ValidationResult } from "../../types/validationResult.js";

dotenv.config();

function createGitHubDiffProvider(): GitHubProvider {
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (githubToken) {
    try {
      return new RestfulGitHubDiffProvider(githubToken);
    } catch (error) {
      console.warn(`Unable to create RESTful Provider: ${error}`);
      console.warn("Falling back to CLI Provider");
      return new CliGitHubDiffProvider();
    }
  }
  
  return new CliGitHubDiffProvider();
}

/**
 * Convenience method: Get GitHub PR diff
 * Create appropriate provider using factory and get diff
 */
export async function getGitHubPRDiff(prUrl: string): Promise<ValidationResult<string>> {
  const provider = createGitHubDiffProvider();
  return await provider.getPRDiff(prUrl);
} 