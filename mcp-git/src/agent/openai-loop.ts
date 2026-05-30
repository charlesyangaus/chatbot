type ChatMessage = Record<string, unknown>;

type OpenAITool = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<string>;

const MAX_ITERATIONS = 40;

export async function runOpenAIAgentLoop(options: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  tools: OpenAITool[];
  executeTool: ToolExecutor;
  onStatus?: (message: string) => void;
}): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: options.systemPrompt },
    { role: "user", content: options.userPrompt },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    options.onStatus?.(`OpenAI turn ${i + 1}…`);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        tools: options.tools,
        tool_choice: "auto",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${errText.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };

    const message = data.choices?.[0]?.message;
    if (!message) {
      throw new Error("OpenAI returned no message");
    }

    console.error(`[openai-loop] message: ${JSON.stringify(message)}`);
    messages.push(message);

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return message.content?.trim() || "Done.";
    }

    for (const call of toolCalls) {
      const toolName = call.function.name;
      let toolArgs: Record<string, unknown> = {};

      try {
        toolArgs = JSON.parse(call.function.arguments) as Record<string, unknown>;
      } catch {
        toolArgs = {};
      }

      options.onStatus?.(`Tool: ${toolName}`);

      let result: string;
      try {
        result = await options.executeTool(toolName, toolArgs);
      } catch (error) {
        result = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  throw new Error(`Agent exceeded ${MAX_ITERATIONS} iterations`);
}
