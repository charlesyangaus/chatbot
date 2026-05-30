#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerGitTools } from "./register-tools.js";

const server = new McpServer({
  name: "git-mcp",
  version: "1.2.0",
});

registerGitTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
