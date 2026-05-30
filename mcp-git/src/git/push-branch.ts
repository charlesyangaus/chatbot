import { assertGitRepo, currentBranch, git, resolveRepoPath } from "./run.js";

export type PushBranchOptions = {
  branchName?: string;
  remote?: string;
  setUpstream?: boolean;
  repoPath?: string;
};

export type PushBranchResult = {
  branchName: string;
  remote: string;
  repoPath: string;
};

export async function pushBranch(
  options: PushBranchOptions,
): Promise<PushBranchResult> {
  const repoPath = resolveRepoPath(options.repoPath);
  await assertGitRepo(repoPath);

  const branchName = options.branchName ?? (await currentBranch(repoPath));
  const remote = options.remote ?? "origin";
  const setUpstream = options.setUpstream ?? true;

  const args = setUpstream
    ? ["push", "-u", remote, branchName]
    : ["push", remote, branchName];

  await git(args, repoPath);

  return {
    branchName,
    remote,
    repoPath,
  };
}
