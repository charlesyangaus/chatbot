import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { commitChanges } from "./git/commit-changes.js";
import { createBranch } from "./git/create-branch.js";
import { createPullRequest } from "./git/create-pull-request.js";
import { pushBranch } from "./git/push-branch.js";
import {
  finishCodedChangeAndPr,
  startCodedChange,
} from "./git/workflow.js";
import { errorResult, successResult } from "./tool-response.js";

const repoPathSchema = z
  .string()
  .optional()
  .describe("Absolute path to the git repository. Defaults to the server cwd.");

const createBranchSchema = z.object({
  branchName: z.string().min(1).describe("Name of the branch to create."),
  baseBranch: z
    .string()
    .optional()
    .describe(
      "Branch to create from. Defaults to the current branch, or main/master.",
    ),
  checkout: z
    .boolean()
    .optional()
    .describe("Whether to check out the new branch. Defaults to true."),
  repoPath: repoPathSchema,
});

const commitChangesSchema = z.object({
  message: z.string().min(1).describe("Commit message."),
  files: z
    .array(z.string())
    .optional()
    .describe(
      "Repo-relative paths to stage. Defaults to all changes (git add .).",
    ),
  repoPath: repoPathSchema,
});

const pushBranchSchema = z.object({
  branchName: z
    .string()
    .optional()
    .describe("Branch to push. Defaults to the current branch."),
  remote: z.string().optional().describe("Remote name. Defaults to origin."),
  setUpstream: z
    .boolean()
    .optional()
    .describe("Set upstream tracking. Defaults to true."),
  repoPath: repoPathSchema,
});

const createPullRequestSchema = z.object({
  title: z.string().min(1).describe("Pull request title."),
  body: z.string().describe("Pull request description."),
  baseBranch: z
    .string()
    .optional()
    .describe("Target branch for the PR. Defaults to main/master."),
  headBranch: z
    .string()
    .optional()
    .describe("Source branch for the PR. Defaults to the current branch."),
  draft: z
    .boolean()
    .optional()
    .describe("Create the PR as a draft. Defaults to false."),
  push: z
    .boolean()
    .optional()
    .describe("Push the head branch before creating the PR. Defaults to true."),
  repoPath: repoPathSchema,
});

const startCodedChangeSchema = z.object({
  taskSummary: z
    .string()
    .min(1)
    .describe(
      "Short description of the work, e.g. 'add tests for createBranch'. Used to name the branch.",
    ),
  kind: z
    .enum(["test", "feature", "fix"])
    .optional()
    .describe("Branch prefix: test/, feature/, or fix/. Defaults to feature."),
  branchName: z
    .string()
    .optional()
    .describe("Override auto-generated branch name."),
  baseBranch: z
    .string()
    .optional()
    .describe("Base branch to branch from. Defaults to main/master."),
  repoPath: repoPathSchema,
});

const finishCodedChangeAndPrSchema = z.object({
  commitMessage: z.string().min(1).describe("Git commit message."),
  prTitle: z.string().min(1).describe("Pull request title."),
  prBody: z.string().describe("Pull request body (markdown)."),
  files: z
    .array(z.string())
    .optional()
    .describe(
      "Repo-relative paths to commit. Defaults to all changes (git add .).",
    ),
  baseBranch: z
    .string()
    .optional()
    .describe("PR target branch. Defaults to main/master."),
  draft: z
    .boolean()
    .optional()
    .describe("Open as draft PR. Defaults to false."),
  repoPath: repoPathSchema,
});

export function registerGitTools(server: McpServer): void {
  server.registerTool(
    "create_branch",
    {
      description:
        "Create a new git branch from a base branch. Optionally check out the new branch.",
      inputSchema: createBranchSchema,
    },
    async (args) => {
      try {
        const result = await createBranch(args);
        return successResult(
          result.checkedOut
            ? `Created and checked out branch "${result.branchName}" from "${result.baseBranch}".`
            : `Created branch "${result.branchName}" from "${result.baseBranch}".`,
          result,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "commit_changes",
    {
      description:
        "Stage file changes and create a git commit on the current branch.",
      inputSchema: commitChangesSchema,
    },
    async (args) => {
      try {
        const result = await commitChanges(args);
        return successResult(
          `Committed ${result.commitHash.slice(0, 7)} on "${result.branch}".`,
          result,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "push_branch",
    {
      description: "Push a branch to the remote (origin by default).",
      inputSchema: pushBranchSchema,
    },
    async (args) => {
      try {
        const result = await pushBranch(args);
        return successResult(
          `Pushed "${result.branchName}" to ${result.remote}.`,
          result,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "create_pull_request",
    {
      description:
        "Push the head branch (optional) and open a GitHub pull request using the gh CLI.",
      inputSchema: createPullRequestSchema,
    },
    async (args) => {
      try {
        const result = await createPullRequest(args);
        return successResult(`Created pull request: ${result.url}`, result);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "start_coded_change",
    {
      description:
        "Start a coded-change workflow: create and check out a branch for a task. Call this first before editing code when the user wants a PR.",
      inputSchema: startCodedChangeSchema,
    },
    async (args) => {
      try {
        const result = await startCodedChange(args);
        return successResult(
          `Ready on branch "${result.branchName}" (from ${result.baseBranch}). Implement the change, then call finish_coded_change_and_pr.`,
          result,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "finish_coded_change_and_pr",
    {
      description:
        "Finish a coded-change workflow: commit staged changes, push, and open a GitHub PR. Call after implementing and testing the change.",
      inputSchema: finishCodedChangeAndPrSchema,
    },
    async (args) => {
      try {
        const result = await finishCodedChangeAndPr(args);
        return successResult(
          `Committed ${result.commitHash.slice(0, 7)} and opened PR: ${result.prUrl}`,
          result,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
