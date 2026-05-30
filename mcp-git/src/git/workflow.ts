import { branchPrefixForKind, slugifyBranchName } from "./branch-name.js";
import { createBranch } from "./create-branch.js";
import { commitChanges } from "./commit-changes.js";
import { createPullRequest } from "./create-pull-request.js";
import { resolveBaseBranch, resolveRepoPath } from "./run.js";

export type StartCodedChangeOptions = {
  taskSummary: string;
  kind?: "test" | "feature" | "fix";
  branchName?: string;
  baseBranch?: string;
  repoPath?: string;
};

export type StartCodedChangeResult = {
  branchName: string;
  baseBranch: string;
  taskSummary: string;
  repoPath: string;
  nextSteps: string[];
};

export type FinishCodedChangeAndPrOptions = {
  commitMessage: string;
  prTitle: string;
  prBody: string;
  files?: string[];
  baseBranch?: string;
  draft?: boolean;
  repoPath?: string;
};

export type FinishCodedChangeAndPrResult = {
  branch: string;
  commitHash: string;
  prUrl: string;
  repoPath: string;
};

export async function startCodedChange(
  options: StartCodedChangeOptions,
): Promise<StartCodedChangeResult> {
  const repoPath = resolveRepoPath(options.repoPath);
  const baseBranch = await resolveBaseBranch(repoPath, options.baseBranch);
  const prefix = branchPrefixForKind(options.kind ?? "feature");
  const branchName =
    options.branchName ?? slugifyBranchName(options.taskSummary, prefix);

  await createBranch({
    branchName,
    baseBranch,
    checkout: true,
    repoPath,
  });

  return {
    branchName,
    baseBranch,
    taskSummary: options.taskSummary,
    repoPath,
    nextSteps: [
      "Implement the requested code or tests in the working tree.",
      "Run the relevant test suite and fix failures.",
      "Call finish_coded_change_and_pr with commit message and PR details.",
    ],
  };
}

export async function finishCodedChangeAndPr(
  options: FinishCodedChangeAndPrOptions,
): Promise<FinishCodedChangeAndPrResult> {
  const repoPath = resolveRepoPath(options.repoPath);

  const commit = await commitChanges({
    message: options.commitMessage,
    files: options.files,
    repoPath,
  });

  const pr = await createPullRequest({
    title: options.prTitle,
    body: options.prBody,
    baseBranch: options.baseBranch,
    draft: options.draft,
    push: true,
    repoPath,
  });

  return {
    branch: commit.branch,
    commitHash: commit.commitHash,
    prUrl: pr.url,
    repoPath,
  };
}
