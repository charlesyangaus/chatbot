#!/usr/bin/env node

import { readRequirementFromArgv, runAgent } from "./agent/run.js";
import { loadRepoEnv } from "./load-env.js";

const USAGE = `Usage:
  mcp-git run "<requirement>"
  mcp-git run
  echo "<requirement>" | mcp-git run

Examples:
  mcp-git run "Add unit tests for server/src/rag/embeddings.ts and create a PR"
  npm run mcp:git:run -- "Fix bug in chunk.ts and open a PR"

Environment:
  OPENAI_API_KEY   (required) — loaded from server/.env or .env in repo root
  OPENAI_MODEL     (optional, default gpt-4o-mini)

Spawns the git MCP server, runs an OpenAI agent with git + file tools, then stops the server.
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.error(USAGE);
    process.exit(args.includes("--help") || args.includes("-h") ? 0 : 1);
  }

  const subcommand = args[0];

  if (subcommand !== "run") {
    console.error(USAGE);
    process.exit(1);
  }

  const requirement = await readRequirementFromArgv(args.slice(1));
  const repoRoot = loadRepoEnv();

  try {
    await runAgent(requirement, repoRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mcp-git] Error: ${message}`);
    process.exit(1);
  }
}

await main();
