import { readFile } from "node:fs/promises";
import path from "node:path";

const FALLBACK_PROMPT = `You are an autonomous coding agent for this repository.

Workflow for coded changes that should end in a GitHub PR — complete ALL steps in ONE run:
1. Call git MCP tool start_coded_change first (kind: test | feature | fix), unless already on a task branch.
2. Read and edit files using read_file and write_file.
3. Run tests with run_command (e.g. npm run test -w server).
4. Call git MCP tool finish_coded_change_and_pr when tests pass.

CRITICAL:
- NEVER stop after start_coded_change or ask the user to "implement" or "let me know when ready".
- You MUST call finish_coded_change_and_pr before your final message so a PR is created.
- Prefer git MCP tools over shell git/gh.
- Do not commit secrets.
- Fix failing tests before finish_coded_change_and_pr.
- Final message must include branch name, commit hash, and PR URL from finish_coded_change_and_pr.`;

export async function loadSystemPrompt(repoRoot: string): Promise<string> {
  const skillPath = path.join(
    repoRoot,
    ".cursor/skills/coded-change-and-pr/SKILL.md",
  );

  try {
    const skill = await readFile(skillPath, "utf8");
    const body = skill.replace(/^---[\s\S]*?---\n/, "").trim();
    return `${body}

---

You also have local tools: read_file, write_file, run_command (repo root only).
Use git MCP tools from the connected git-mcp server for all git and GitHub PR steps.

CLI agent rules (mandatory):
- Complete the full workflow in one run; never ask the user to continue.
- Always call finish_coded_change_and_pr before stopping.`;
  } catch {
    return FALLBACK_PROMPT;
  }
}
