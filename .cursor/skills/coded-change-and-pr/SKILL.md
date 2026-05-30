---
name: coded-change-and-pr
description: >-
  Runs the full workflow for coded changes: create a git branch, implement the
  change (tests, features, fixes), commit, and open a GitHub pull request via
  git MCP tools. Use when the user asks to add tests for a function, implement
  a feature, fix a bug with a PR, or any request that should end in a GitHub PR
  without manual git steps.
---

# Coded change and PR workflow

When the user asks for a coded change that should land as a GitHub PR (e.g. "add
test case for createBranch", "implement feature X", "fix bug Y and open a PR"),
run this workflow **end to end without stopping for git confirmations**.

## Prerequisites

- Git MCP server is enabled (`.cursor/mcp.json` → `git`)
- `gh` CLI is installed and authenticated (`gh auth login`)
- Run `npm run mcp:git:build` if MCP tools are missing

## Workflow

### 1. Start — create branch

Call MCP tool **`start_coded_change`**:

| Field | Value |
|-------|-------|
| `taskSummary` | Short slug-friendly summary, e.g. `add tests for createBranch` |
| `kind` | `test` for tests, `feature` for features, `fix` for bug fixes |
| `baseBranch` | `main` unless the user specifies another base |

Do **not** create the branch manually with shell git commands.

### 2. Implement — update code

- Locate the target function/module and read existing code and tests.
- Follow project conventions:
  - Server tests: `server/src/**/*.test.ts`, Jest, colocated with source
  - Client tests: `client/src/**/*.test.ts`
  - Run `npm run test -w server` or `npm run test -w client` as appropriate
- Write focused, meaningful tests — not trivial assertions.
- Fix failures before continuing.

### 3. Finish — commit and open PR

Call MCP tool **`finish_coded_change_and_pr`**:

| Field | Guidance |
|-------|----------|
| `commitMessage` | 1–2 sentences, focus on **why** (repo commit style) |
| `prTitle` | Clear, concise title |
| `prBody` | `## Summary` bullets + `## Test plan` checklist |
| `files` | Optional list of changed files; omit to stage all changes |
| `baseBranch` | Same base used in step 1 |

Do **not** run manual `git commit`, `git push`, or `gh pr create` unless MCP fails.

### 4. Report result

Tell the user:

- Branch name
- Commit hash (short)
- PR URL from the MCP response

## Example: "add test case for createBranch"

1. `start_coded_change({ taskSummary: "add tests for createBranch", kind: "test", baseBranch: "main" })`
2. Add `mcp-git/src/git/create-branch.test.ts`, mirror patterns from `server/src/rag/chunk.test.ts`
3. Run tests for the package that owns the code
4. `finish_coded_change_and_pr({ commitMessage: "...", prTitle: "Add tests for createBranch", prBody: "..." })`

## Rules

- Complete all four steps in one session unless blocked (tests fail, missing auth, etc.).
- Do not commit secrets (`.env`, keys, credentials).
- Do not push or open a PR if tests are failing unless the user explicitly accepts that.
- If MCP is unavailable, fall back to shell git + `gh` using the same branch naming: `test/<slug>` or `feature/<slug>`.
