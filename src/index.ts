#!/usr/bin/env node

import { Command } from "commander";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Logger } from "./utils/logger.js";
import { setServerConfig, getServerConfig } from "./config.js";
import { setOpenCodeServerConfig, isOpenCodeServerConfigured } from "./opencode-server-config.js";
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
    .option("--opencode-url <url>", "OpenCode server URL (e.g., http://localhost:4096) - enables OpenCode server API tools")
    .option("--opencode-username <username>", "OpenCode server HTTP basic auth username (default: opencode)", "opencode")
    .option("--opencode-password <password>", "OpenCode server HTTP basic auth password")
    .option("--opencode-insecure", "Disable SSL certificate verification (allows self-signed certs, dev/testing only)")
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

  // Configure OpenCode server connection if provided
  if (options.opencodeUrl) {
    setOpenCodeServerConfig({
      baseUrl: options.opencodeUrl,
      username: options.opencodeUsername,
      password: options.opencodePassword,
      rejectUnauthorized: !options.opencodeInsecure
    });
    Logger.debug(`OpenCode server API tools enabled - connecting to: ${options.opencodeUrl}`);
    if (options.opencodeInsecure) {
      Logger.warn("WARNING: SSL certificate verification is disabled (--opencode-insecure). This should only be used for development/testing.");
    }
  } else {
    Logger.debug("OpenCode server API tools disabled (no --opencode-url provided)");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  Logger.debug("opencode-mcp-tool listening on stdio");
}

main().catch((error) => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});
