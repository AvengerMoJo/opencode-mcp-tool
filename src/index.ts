#!/usr/bin/env node

import { Command } from "commander";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Logger } from "./utils/logger.js";
import { setServerConfig, getServerConfig } from "./config.js";
import { setOpenCodeServerConfig, isOpenCodeServerConfigured } from "./opencode-server-config.js";
import { createMCPServer, setupProgressNotifications, setupRequestHandlers } from "./server-core.js";
import { loadInitialConfig, startConfigWatcher, stopConfigWatcher } from "./config-watcher.js";

const server = createMCPServer();
const progressFunctions = setupProgressNotifications(server);
setupRequestHandlers(server, progressFunctions);

async function main() {
  const program = new Command();

  program
    .name("opencode-mcp")
    .description("MCP server for OpenCode CLI integration")
    .version("1.1.4")
    .option("-m, --model <model>", "Primary model to use for CLI-based tools (e.g., google/gemini-2.5-pro). Required when NOT using --servers-config")
    .option("-f, --fallback-model <model>", "Fallback model for quota/error situations")
    .option("--opencode-url <url>", "OpenCode server URL (e.g., http://localhost:4096) - enables OpenCode server API tools")
    .option("--opencode-username <username>", "OpenCode server HTTP basic auth username (default: opencode)", "opencode")
    .option("--opencode-password <password>", "OpenCode server HTTP basic auth password")
    .option("--opencode-insecure", "Disable SSL certificate verification (allows self-signed certs, dev/testing only)")
    .option("--servers-config <path>", "Path to servers configuration JSON file (enables multi-server mode)")
    .parse();

  const options = program.opts();

  // Validate model requirement
  if (!options.serversConfig && !options.opencodeUrl && !options.model) {
    throw new Error("--model is required when not using --servers-config or --opencode-url");
  }

  setServerConfig({
    primaryModel: options.model,
    fallbackModel: options.fallbackModel
  });

  const config = getServerConfig();

  if (options.model) {
    Logger.debug("init opencode-mcp-tool with model:", config.primaryModel);
  } else {
    Logger.debug("init opencode-mcp-tool (multi-server mode, no CLI model needed)");
  }
  if (config.fallbackModel) {
    Logger.debug("fallback model:", config.fallbackModel);
  }

  // Configure OpenCode server connection
  if (options.serversConfig) {
    // Multi-server mode
    try {
      const config = await loadInitialConfig(options.serversConfig);
      const activeCount = config.servers.filter(s => s.status === 'active').length;
      Logger.log(`Multi-server mode enabled: ${activeCount}/${config.servers.length} active servers from ${options.serversConfig}`);
      if (config.default_server) {
        Logger.log(`Default server: ${config.default_server}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load servers config: ${error.message}`);
      }
      throw error;
    }
  } else if (options.opencodeUrl) {
    // Single-server mode
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
    Logger.debug("OpenCode server API tools disabled (no --opencode-url or --servers-config provided)");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  Logger.debug("opencode-mcp-tool listening on stdio");
  
  // Start config watcher if using multi-server mode
  if (options.serversConfig) {
    startConfigWatcher(options.serversConfig);
  }
  
  // Cleanup on exit
  const cleanup = () => {
    Logger.debug('Shutting down gracefully...');
    if (options.serversConfig) {
      stopConfigWatcher();
    }
    process.exit(0);
  };
  
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

main().catch((error) => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});
