import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function resolveRepoPath(repoPath?: string): string {
  return repoPath ?? process.cwd();
}

export async function git(args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd });
    return stdout.trim();
  } catch (error) {
    throw formatExecError("git", args, error);
  }
}

export async function gh(args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("gh", args, { cwd });
    return stdout.trim();
  } catch (error) {
    throw formatExecError("gh", args, error);
  }
}

export async function resolveBaseBranch(
  cwd: string,
  baseBranch?: string,
): Promise<string> {
  if (baseBranch) {
    return baseBranch;
  }

  try {
    const current = await git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
    if (current && current !== "HEAD") {
      return current;
    }
  } catch {
    // fall through to default branch detection
  }

  for (const candidate of ["main", "master"]) {
    try {
      await git(["rev-parse", "--verify", candidate], cwd);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    "Could not determine base branch. Specify baseBranch or checkout a branch first.",
  );
}

export async function currentBranch(cwd: string): Promise<string> {
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  if (!branch || branch === "HEAD") {
    throw new Error("Repository is in detached HEAD state.");
  }
  return branch;
}

export async function assertGitRepo(cwd: string): Promise<void> {
  await git(["rev-parse", "--is-inside-work-tree"], cwd);
}

function formatExecError(command: string, args: string[], error: unknown): Error {
  if (error && typeof error === "object" && "stderr" in error) {
    const stderr = String((error as { stderr?: string }).stderr ?? "").trim();
    const message = stderr || String((error as { message?: string }).message ?? error);
    return new Error(`${command} ${args.join(" ")} failed: ${message}`);
  }

  return error instanceof Error ? error : new Error(String(error));
}
