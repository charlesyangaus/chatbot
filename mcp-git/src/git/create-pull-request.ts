import {
  assertGitRepo,
  currentBranch,
  gh,
  resolveBaseBranch,
  resolveRepoPath,
} from "./run.js";
import { pushBranch } from "./push-branch.js";

export type CreatePullRequestOptions = {
  title: string;
  body: string;
  baseBranch?: string;
  headBranch?: string;
  draft?: boolean;
  push?: boolean;
  repoPath?: string;
};

export type CreatePullRequestResult = {
  url: string;
  title: string;
  baseBranch: string;
  headBranch: string;
  repoPath: string;
};

export async function createPullRequest(
  options: CreatePullRequestOptions,
): Promise<CreatePullRequestResult> {
  const repoPath = resolveRepoPath(options.repoPath);
  await assertGitRepo(repoPath);

  const headBranch = options.headBranch ?? (await currentBranch(repoPath));
  const baseBranch = await resolveBaseBranch(repoPath, options.baseBranch);

  if (headBranch === baseBranch) {
    throw new Error(
      `Head branch "${headBranch}" must differ from base branch "${baseBranch}".`,
    );
  }

  if (options.push ?? true) {
    await pushBranch({ branchName: headBranch, repoPath });
  }

  const args = [
    "pr",
    "create",
    "--title",
    options.title,
    "--body",
    options.body,
    "--base",
    baseBranch,
    "--head",
    headBranch,
  ];

  if (options.draft) {
    args.push("--draft");
  }

  const output = await gh(args, repoPath);
  const url = output.split("\n").find((line) => line.startsWith("http")) ?? output;

  return {
    url,
    title: options.title,
    baseBranch,
    headBranch,
    repoPath,
  };
}
