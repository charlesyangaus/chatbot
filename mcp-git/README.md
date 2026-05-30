# mcp-git

Git and GitHub PR automation for this repo, driven from the **command line**.

`mcp-git run` spawns a local [MCP](https://modelcontextprotocol.io/) git server, runs an OpenAI agent with git + file tools, then shuts the server down when finished.

## Prerequisites

- **Node.js** 20+ (22 recommended)
- **git** on your `PATH`
- **OPENAI_API_KEY** in `server/.env` (or exported in your shell)
- **[GitHub CLI](https://cli.github.com/)** (`gh`) authenticated: `gh auth login`

## Setup

From the repository root:

```bash
npm install
npm run mcp:git:build
```

## Usage

```bash
# One-shot task
npm run mcp:git:run -- "Add unit tests for server/src/rag/embeddings.ts and create a PR"

# Interactive prompt
npm run run -w mcp-git

# Stdin
echo "Add tests for chunk.ts and open a PR" | npm run run -w mcp-git --
```

Optional: `OPENAI_MODEL` (default `gpt-4o-mini`).

Progress logs go to **stderr** (`[mcp-git] …`). The final summary is on **stdout**.

### What happens

1. Loads env from `server/.env` (walks up from `mcp-git/` when using npm workspaces)
2. Starts `mcp-git/dist/index.js` (stdio MCP server)
3. OpenAI agent calls git MCP tools + `read_file` / `write_file` / `run_command`
4. Stops the MCP server on exit

## Git MCP tools

### Workflow tools (preferred)

| Tool | When |
|------|------|
| `start_coded_change` | First — create and check out a branch |
| `finish_coded_change_and_pr` | Last — commit (if needed), push, open PR |

### Low-level tools

| Tool | Purpose |
|------|---------|
| `create_branch` | Create/check out a branch |
| `commit_changes` | Stage and commit |
| `push_branch` | Push to `origin` |
| `create_pull_request` | Open a PR via `gh` |

## Development

```bash
npm run build -w mcp-git
npm run dev:run -w mcp-git    # CLI with tsx
npm run start -w mcp-git      # MCP server only (stdio, for debugging)
```

## Project structure

```
mcp-git/
├── src/
│   ├── cli.ts              # CLI entry (mcp-git run)
│   ├── index.ts            # MCP server (spawned by CLI)
│   ├── register-tools.ts
│   ├── agent/              # OpenAI loop + MCP client
│   └── git/                # git/gh implementations
├── package.json
└── tsconfig.json
```

## Notes

- Do not run `npm run mcp:git:dev` and type tasks there — it only speaks the MCP protocol. Use `mcp-git run` instead.
- Do not commit secrets (`.env`, API keys, etc.).
