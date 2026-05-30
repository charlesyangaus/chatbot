import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

import { findRepoRoot } from "./repo-root.js";

export { findRepoRoot } from "./repo-root.js";

/**
 * Load .env files from the repo without overriding variables already set in the shell.
 */
export function loadRepoEnv(startDir = process.cwd()): string {
  const repoRoot = findRepoRoot(startDir);
  const candidates = [
    path.join(repoRoot, ".env"),
    path.join(repoRoot, "server", ".env"),
  ];

  for (const envPath of candidates) {
    if (existsSync(envPath)) {
      config({ path: envPath, override: false });
    }
  }

  return repoRoot;
}
