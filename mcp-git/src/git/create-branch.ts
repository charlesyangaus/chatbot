import {
  assertGitRepo,
  git,
  resolveBaseBranch,
  resolveRepoPath,
} from "./run.js";

export type CreateBranchOptions = {
  branchName: string;
  baseBranch?: string;
  checkout?: boolean;
  repoPath?: string;
};

export type CreateBranchResult = {
  branchName: string;
  baseBranch: string;
  checkedOut: boolean;
  repoPath: string;
};

export async function createBranch(
  options: CreateBranchOptions,
): Promise<CreateBranchResult> {
  const repoPath = resolveRepoPath(options.repoPath);
  const baseBranch = await resolveBaseBranch(repoPath, options.baseBranch);
  const checkout = options.checkout ?? true;

  await assertGitRepo(repoPath);

  try {
    await git(["rev-parse", "--verify", `refs/heads/${options.branchName}`], repoPath);
    throw new Error(`Branch "${options.branchName}" already exists.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already exists")) {
      throw error;
    }
    // branch does not exist — expected
  }

  if (checkout) {
    await git(["checkout", "-b", options.branchName, baseBranch], repoPath);
  } else {
    await git(["branch", options.branchName, baseBranch], repoPath);
  }

  return {
    branchName: options.branchName,
    baseBranch,
    checkedOut: checkout,
    repoPath,
  };
}
