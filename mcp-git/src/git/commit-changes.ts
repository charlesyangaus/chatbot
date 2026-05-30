import { assertGitRepo, currentBranch, git, resolveRepoPath } from "./run.js";

export type CommitChangesOptions = {
  message: string;
  files?: string[];
  repoPath?: string;
};

export type CommitChangesResult = {
  branch: string;
  commitHash: string;
  files: string[];
  committed: boolean;
  repoPath: string;
};

export async function hasUncommittedChanges(repoPath?: string): Promise<boolean> {
  const cwd = resolveRepoPath(repoPath);
  await assertGitRepo(cwd);
  const status = await git(["status", "--porcelain"], cwd);
  return status.length > 0;
}

export async function commitChanges(
  options: CommitChangesOptions,
): Promise<CommitChangesResult> {
  const repoPath = resolveRepoPath(options.repoPath);
  await assertGitRepo(repoPath);

  const branch = await currentBranch(repoPath);
  const files = options.files?.length ? options.files : ["."];

  await git(["add", "--", ...files], repoPath);

  const status = await git(["status", "--porcelain"], repoPath);
  if (!status) {
    const commitHash = await git(["rev-parse", "HEAD"], repoPath);
    return {
      branch,
      commitHash,
      files,
      committed: false,
      repoPath,
    };
  }

  await git(["commit", "-m", options.message], repoPath);
  const commitHash = await git(["rev-parse", "HEAD"], repoPath);

  return {
    branch,
    commitHash,
    files,
    committed: true,
    repoPath,
  };
}
