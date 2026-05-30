import { existsSync } from "node:fs";
import path from "node:path";

function hasServerEnv(dir: string): boolean {
  return (
    existsSync(path.join(dir, "server", ".env")) ||
    existsSync(path.join(dir, "server", ".env.example"))
  );
}

/**
 * npm -w mcp-git runs scripts with cwd set to the mcp-git package, not the monorepo root.
 * Walk up until we find server/.env (or .env.example) at the chatbot repo root.
 */
export function findRepoRoot(startDir = process.cwd()): string {
  let dir = path.resolve(startDir);

  while (true) {
    if (hasServerEnv(dir)) {
      return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return path.resolve(startDir);
}
