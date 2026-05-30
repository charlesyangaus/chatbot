import { access } from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export type McpGitTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

export class GitMcpSession {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private tools: McpGitTool[] = [];

  constructor(private readonly repoRoot: string) {}

  async start(): Promise<McpGitTool[]> {
    const serverEntry = path.resolve(this.repoRoot, "mcp-git/dist/index.js");
    try {
      await access(serverEntry);
    } catch {
      throw new Error(
        `Git MCP server not built. Run: npm run mcp:git:build (missing ${serverEntry})`,
      );
    }

    this.transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: this.repoRoot,
      stderr: "pipe",
    });

    this.client = new Client({ name: "mcp-git-cli", version: "1.0.0" });
    await this.client.connect(this.transport);

    const listed = await this.client.listTools();
    this.tools = (listed.tools ?? []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
    }));

    return this.tools;
  }

  getTools(): McpGitTool[] {
    return this.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    if (!this.client) {
      throw new Error("Git MCP session is not started");
    }

    const result = await this.client.callTool({
      name,
      arguments: { ...args, repoPath: args.repoPath ?? this.repoRoot },
    });

    const content = Array.isArray(result.content) ? result.content : [];
    const parts = content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text);

    return parts.join("\n") || JSON.stringify(result);
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.tools = [];
  }
}

export function mcpToolsForOpenAI(tools: McpGitTool[]): Array<{
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description ?? tool.name,
      parameters: tool.inputSchema ?? { type: "object", properties: {} },
    },
  }));
}
