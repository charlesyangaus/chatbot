import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { GitMcpSession, mcpToolsForOpenAI } from "./git-mcp-session.js";
import { executeLocalTool, localToolsForOpenAI } from "./local-tools.js";
import { runOpenAIAgentLoop } from "./openai-loop.js";
import { loadSystemPrompt } from "./prompt.js";

function logStatus(message: string): void {
  console.error(`[mcp-git] ${message}`);
}

export async function runAgent(requirement: string, repoRoot: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required for mcp-git run. Set it in server/.env or export it in your shell.",
    );
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const trimmed = requirement.trim();
  if (!trimmed) {
    throw new Error("Requirement cannot be empty");
  }

  const mcpSession = new GitMcpSession(repoRoot);

  try {
    logStatus("Starting git MCP server…");
    const mcpTools = await mcpSession.start();
    logStatus(`Connected (${mcpTools.length} git tools)`);

    const tools = [...mcpToolsForOpenAI(mcpTools), ...localToolsForOpenAI()];
    const systemPrompt = loadSystemPrompt();

    const mcpToolNames = new Set(mcpTools.map((t) => t.name));

    const augmentedPrompt = `${trimmed}

Complete the entire workflow autonomously in this session: implement the change, run tests, then call finish_coded_change_and_pr. Do not ask me to continue or implement anything manually.`;

    const summary = await runOpenAIAgentLoop({
      apiKey,
      model,
      systemPrompt,
      userPrompt: augmentedPrompt,
      tools,
      onStatus: logStatus,
      executeTool: async (name, args) => {
        if (mcpToolNames.has(name)) {
          return mcpSession.callTool(name, args);
        }
        return executeLocalTool(name, args, repoRoot);
      },
    });

    console.log("\n" + summary);
  } finally {
    logStatus("Stopping git MCP server…");
    await mcpSession.stop();
    logStatus("Done.");
  }
}

export async function readRequirementFromArgv(argv: string[]): Promise<string> {
  const inline = argv.join(" ").trim();
  if (inline) {
    return inline;
  }

  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf8").trim();
  }

  const rl = createInterface({ input, output });
  try {
    return (await rl.question("Requirement: ")).trim();
  } finally {
    rl.close();
  }
}
