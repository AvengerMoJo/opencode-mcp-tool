#!/usr/bin/env node

import { Command } from "commander";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Logger } from "./utils/logger.js";
import { setServerConfig, getServerConfig } from "./config.js";
import { createMCPServer, setupProgressNotifications, setupRequestHandlers } from "./server-core.js";

const server = createMCPServer();
const progressFunctions = setupProgressNotifications(server);
setupRequestHandlers(server, progressFunctions);

async function main() {
  const program = new Command();

  program
    .name("opencode-mcp")
    .description("MCP server for OpenCode CLI integration")
    .version("1.1.4")
    .requiredOption("-m, --model <model>", "Primary model to use (e.g., google/gemini-2.5-pro)")
    .option("-f, --fallback-model <model>", "Fallback model for quota/error situations")
    .parse();

  const options = program.opts();

  setServerConfig({
    primaryModel: options.model,
    fallbackModel: options.fallbackModel
  });

  const config = getServerConfig();

  Logger.debug("init opencode-mcp-tool with model:", config.primaryModel);
  if (config.fallbackModel) {
    Logger.debug("fallback model:", config.fallbackModel);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  Logger.debug("opencode-mcp-tool listening on stdio");
}

main().catch((error) => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});
