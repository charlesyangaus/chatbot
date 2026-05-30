import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type LocalToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export const LOCAL_TOOL_DEFINITIONS: LocalToolDefinition[] = [
  {
    name: "read_file",
    description: "Read a UTF-8 text file relative to the repository root.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Repo-relative file path, e.g. server/src/rag/chunk.ts",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write UTF-8 text to a file relative to the repository root.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Repo-relative file path" },
        content: { type: "string", description: "Full file contents" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "run_command",
    description:
      "Run a shell command in the repository root (e.g. npm test). Max 2 minutes.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to run, e.g. npm run test -w server",
        },
      },
      required: ["command"],
    },
  },
];

function resolveRepoPath(repoRoot: string, relativePath: string): string {
  const resolved = path.resolve(repoRoot, relativePath);
  const normalizedRoot = path.resolve(repoRoot);
  if (
    resolved !== normalizedRoot &&
    !resolved.startsWith(normalizedRoot + path.sep)
  ) {
    throw new Error(`Path escapes repository root: ${relativePath}`);
  }
  return resolved;
}

export async function executeLocalTool(
  name: string,
  args: Record<string, unknown>,
  repoRoot: string,
): Promise<string> {
  switch (name) {
    case "read_file": {
      const filePath = resolveRepoPath(repoRoot, String(args.path));
      const content = await readFile(filePath, "utf8");
      return content;
    }
    case "write_file": {
      const filePath = resolveRepoPath(repoRoot, String(args.path));
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, String(args.content), "utf8");
      return `Wrote ${args.path}`;
    }
    case "run_command": {
      const command = String(args.command);
      if (/[;&|`$<>]/.test(command)) {
        throw new Error("Command contains disallowed characters");
      }
      try {
        const { stdout, stderr } = await execFileAsync("bash", ["-lc", command], {
          cwd: repoRoot,
          timeout: 120_000,
          maxBuffer: 4 * 1024 * 1024,
        });
        return [stdout, stderr].filter(Boolean).join("\n") || "(no output)";
      } catch (error) {
        const err = error as { stdout?: string; stderr?: string; message?: string };
        const out = [err.stdout, err.stderr, err.message].filter(Boolean).join("\n");
        throw new Error(out || "Command failed");
      }
    }
    default:
      throw new Error(`Unknown local tool: ${name}`);
  }
}

export function localToolsForOpenAI(): Array<{
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  return LOCAL_TOOL_DEFINITIONS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
