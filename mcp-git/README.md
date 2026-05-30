# mcp-git

A local [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that exposes git and GitHub pull request tools to Cursor and other MCP clients.

The server runs as a child process and communicates over **stdio** (`StdioServerTransport`). Cursor spawns it using the config in [`.cursor/mcp.json`](../.cursor/mcp.json).

## Prerequisites

- **Node.js** 20+ (22 recommended)
- **git** on your `PATH`
- **[GitHub CLI](https://cli.github.com/)** (`gh`) installed and authenticated:

  ```bash
  gh auth login
  ```

## Setup

From the repository root:

```bash
npm install
npm run mcp:git:build
```

Cursor should pick up the server automatically via `.cursor/mcp.json`:

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

If tools do not appear, reload MCP servers in Cursor (or restart Cursor) after building.

## CLI (`mcp-git run`)

Run a full coding task from the terminal. The CLI:

1. Spawns the **git MCP server** as a subprocess
2. Runs an **OpenAI agent** with git MCP tools plus local `read_file` / `write_file` / `run_command` tools
3. **Stops the MCP server** when finished

From the repository root (requires `OPENAI_API_KEY` in `server/.env`):

`npm run run -w mcp-git` runs with cwd inside `mcp-git/`; the CLI walks up to the monorepo root to load `server/.env` automatically.

```bash
npm run mcp:git:build

# One-shot requirement
npm run mcp:git:run -- "Add unit tests for server/src/rag/embeddings.ts and create a PR"

# Or after npm link / npx
npx mcp-git-run "Add unit tests for server/src/rag/embeddings.ts and create a PR"

# Interactive prompt
npm run run -w mcp-git --

# Stdin
echo "Add tests for chunk.ts and open a PR" | npm run run -w mcp-git --
```

Optional: `OPENAI_MODEL` (default `gpt-4o-mini`).

Progress logs go to **stderr**; the final agent summary is printed on **stdout**.

This is **not** the same as `npm run mcp:git:dev` — the dev script only starts the MCP server and waits for protocol messages; it does not accept natural-language tasks.

## Tools

### Low-level git tools

| Tool | Description |
|------|-------------|
| `create_branch` | Create a branch from a base branch; optionally check it out |
| `commit_changes` | Stage files and commit on the current branch |
| `push_branch` | Push a branch to `origin` (or another remote) |
| `create_pull_request` | Push (optional) and open a GitHub PR via `gh` |

All tools accept an optional `repoPath` (absolute path). When omitted, the server uses its working directory (the workspace root via `cwd` in `mcp.json`).

### Workflow tools

These wrap the low-level tools for common agent workflows:

| Tool | When to use |
|------|-------------|
| `start_coded_change` | **First** — creates and checks out a branch named from the task (e.g. `test/add-tests-for-createbranch`) |
| `finish_coded_change_and_pr` | **Last** — commits, pushes, and opens a PR |

## Example workflow

Ask Cursor in natural language:

> Add test cases for the `createBranch` function and open a PR.

The agent should:

1. Call `start_coded_change` with `kind: "test"`
2. Write and run tests using normal file editing
3. Call `finish_coded_change_and_pr` with commit message and PR details

Or call tools manually in sequence:

```
start_coded_change({
  taskSummary: "add tests for createBranch",
  kind: "test",
  baseBranch: "main"
})

commit_changes({
  message: "Add unit tests for createBranch edge cases."
})

create_pull_request({
  title: "Add tests for createBranch",
  body: "## Summary\n- Covers duplicate branch and checkout paths\n\n## Test plan\n- [x] npm run test -w mcp-git"
})
```

## Project skill

The repo includes a Cursor skill at [`.cursor/skills/coded-change-and-pr/`](../.cursor/skills/coded-change-and-pr/SKILL.md) that instructs the agent to run the full branch → code → commit → PR workflow automatically when you ask for tests, features, or fixes that should land as a PR.

## Development

```bash
# Build
npm run build -w mcp-git

# Run directly (stdio — mainly for debugging)
npm run start -w mcp-git

# Watch source with tsx
npm run dev -w mcp-git
```

From the repo root:

```bash
npm run mcp:git:build
npm run mcp:git:dev
```

## Project structure

```
mcp-git/
├── src/
│   ├── index.ts              # MCP server (stdio) for Cursor
│   ├── cli.ts                # CLI entry: mcp-git run
│   ├── register-tools.ts     # Tool schemas and handlers
│   ├── tool-response.ts      # MCP response helpers
│   ├── agent/                # OpenAI + MCP client for CLI
│   │   ├── run.ts
│   │   ├── git-mcp-session.ts
│   │   ├── openai-loop.ts
│   │   ├── local-tools.ts
│   │   └── prompt.ts
│   └── git/
│       ├── run.ts            # git / gh command helpers
│       ├── branch-name.ts    # Branch slug utilities
│       ├── create-branch.ts
│       ├── commit-changes.ts
│       ├── push-branch.ts
│       ├── create-pull-request.ts
│       └── workflow.ts       # start/finish workflow
├── package.json
└── tsconfig.json
```

## Notes

- The MCP server alone does **not** edit files — use Cursor chat or `mcp-git run` for code changes.
- Do not commit secrets (`.env`, API keys, etc.).
- Logs and errors should go to **stderr**; stdout is reserved for the MCP protocol.
