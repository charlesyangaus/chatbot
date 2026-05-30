---
name: coded-change-and-pr
description: >-
  Runs the full workflow for coded changes: create a git branch, implement the
  change (tests, features, fixes), commit, and open a GitHub pull request via
  the git MCP server (mcp-git). Use when the user asks to add tests, implement
  a feature, fix a bug with a PR, or explicitly requests git MCP tools.
---

# Coded change and PR workflow

When the user asks for a coded change that should land as a GitHub PR (e.g. "add
tests for `embedTexts` and create a PR using the git MCP tools"), run this
workflow **end to end without stopping for git confirmations**.

## Git MCP server (`mcp-git`)

Cursor starts the server from [`.cursor/mcp.json`](../../mcp.json):

```json
{
  "mcpServers": {
    "git": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-git/dist/index.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

Bootstrap ([`mcp-git/src/index.ts`](../../../mcp-git/src/index.ts)):

- Creates `McpServer` named **`git-mcp`**
- Registers tools via **`registerGitTools()`** in [`mcp-git/src/register-tools.ts`](../../../mcp-git/src/register-tools.ts)
- Connects over **stdio** (`StdioServerTransport`) — not an interactive chat terminal

Do **not** run `npm run mcp:git:dev` and type requests there. Ask in **Cursor chat**;
Cursor spawns the MCP server in the background.

## Prerequisites

- Git MCP server **enabled and green** in Cursor Settings → MCP (`git`)
- Built at least once: `npm run mcp:git:build` (runs `tsc` → `mcp-git/dist/index.js`)
- `gh` CLI installed and authenticated (`gh auth login`)

## Available MCP tools

Prefer **workflow tools** for this skill. Use **low-level tools** only when the user
asks for a specific git step.

### Workflow tools (default)

| Tool | When |
|------|------|
| `start_coded_change` | **First** — create and check out a branch from the task summary |
| `finish_coded_change_and_pr` | **Last** — commit, push, and open a GitHub PR |

### Low-level tools (optional)

| Tool | Purpose |
|------|---------|
| `create_branch` | Create/check out a branch with an explicit name |
| `commit_changes` | Stage files and commit |
| `push_branch` | Push to `origin` |
| `create_pull_request` | Open a PR via `gh` (push optional) |

All tools accept optional `repoPath` (absolute). When omitted, the server uses
`cwd` from `mcp.json` (workspace root).

## Workflow

### 1. Start — `start_coded_change`

| Field | Value |
|-------|-------|
| `taskSummary` | Short slug-friendly summary, e.g. `add tests for embedTexts` |
| `kind` | `test` \| `feature` \| `fix` (branch prefix: `test/`, `feature/`, `fix/`) |
| `baseBranch` | `main` unless the user specifies another base |
| `branchName` | Optional override; otherwise auto-generated from `taskSummary` |

Do **not** create the branch with shell `git checkout -b` when MCP is available.

### 2. Implement — update code

- Locate the target module; read existing code and tests.
- Follow project conventions:
  - Server tests: `server/src/**/*.test.ts`, Jest, colocated with source
  - Client tests: `client/src/**/*.test.ts`
  - Run `npm run test -w server` or `npm run test -w client` as appropriate
- Write focused, meaningful tests — not trivial assertions.
- Fix failures before continuing.

The MCP server does **not** edit files — use normal Cursor file tools for code changes.

### 3. Finish — `finish_coded_change_and_pr`

| Field | Guidance |
|-------|----------|
| `commitMessage` | 1–2 sentences, focus on **why** (repo commit style) |
| `prTitle` | Clear, concise title |
| `prBody` | `## Summary` bullets + `## Test plan` checklist |
| `files` | Optional repo-relative paths to stage; omit to stage all changes |
| `baseBranch` | Same base used in step 1 |

Do **not** run shell `git commit`, `git push`, or `gh pr create` when MCP is available.

### 4. Report result

Tell the user:

- Branch name
- Commit hash (short)
- PR URL from the MCP tool response

## How the user knows MCP was used

In the chat transcript, MCP calls appear as tool invocations from the **`git`**
server with names like `start_coded_change` and `finish_coded_change_and_pr`.

If MCP is unavailable, shell commands (`git …`, `gh pr create`) may appear instead.
Fall back to shell git + `gh` only when MCP fails or is disabled, using the same
branch naming: `test/<slug>`, `feature/<slug>`, or `fix/<slug>`.

## Example: "add tests for embedTexts and create PR using git MCP tools"

1. `start_coded_change({ taskSummary: "add tests for embedTexts", kind: "test", baseBranch: "main" })`
2. Add `server/src/rag/embeddings.test.ts`; mirror patterns from `server/src/rag/chunk.test.ts`
3. Run `npm run test -w server -- --testPathPattern=embeddings.test`
4. `finish_coded_change_and_pr({ commitMessage: "...", prTitle: "Add tests for embedTexts", prBody: "..." })`

## Rules

- Complete all four steps in one session unless blocked (tests fail, missing auth, etc.).
- Do not commit secrets (`.env`, keys, credentials).
- Do not push or open a PR if tests are failing unless the user explicitly accepts that.
- When the user says "using git MCP tools", always prefer MCP over shell git/gh.
