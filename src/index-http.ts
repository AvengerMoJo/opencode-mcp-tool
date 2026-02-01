#!/usr/bin/env node

import { Command } from "commander";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import { Logger } from "./utils/logger.js";
import { setServerConfig, getServerConfig } from "./config.js";
import { setOpenCodeServerConfig, isOpenCodeServerConfigured } from "./opencode-server-config.js";
import { createMCPServer, setupProgressNotifications, setupRequestHandlers } from "./server-core.js";
import { loadInitialConfig, startConfigWatcher, stopConfigWatcher } from "./config-watcher.js";

const DEBUG_MODE = process.env.DEBUG === "true";

const server = createMCPServer();
const progressFunctions = setupProgressNotifications(server);
setupRequestHandlers(server, progressFunctions);

async function main() {
  const program = new Command();

  program
    .name("opencode-mcp-http")
    .description("MCP server for OpenCode CLI integration with HTTP transport")
    .version("1.1.4")
    .option("-m, --model <model>", "Primary model to use for CLI-based tools (e.g., google/gemini-2.5-pro). Required when NOT using --servers-config")
    .option("-f, --fallback-model <model>", "Fallback model for quota/error situations")
    .option("-t, --bearer-token <token>", "Bearer token for authentication (Authorization: Bearer <token>)")
    .option("-p, --port <port>", "HTTP server port", "3005")
    .option("-H, --host <host>", "HTTP server host", "0.0.0.0")
    .option("-d, --debug", "Enable debug logging")
    .option("--opencode-url <url>", "OpenCode server URL (e.g., http://localhost:4096) - enables OpenCode server API tools")
    .option("--opencode-username <username>", "OpenCode server HTTP basic auth username (default: opencode)", "opencode")
    .option("--opencode-password <password>", "OpenCode server HTTP basic auth password")
    .option("--opencode-insecure", "Disable SSL certificate verification (allows self-signed certs, dev/testing only)")
    .option("--servers-config <path>", "Path to servers configuration JSON file (enables multi-server mode)")
    .parse(process.argv);

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
    Logger.debug("init opencode-mcp-tool with HTTP transport, model:", config.primaryModel);
  } else {
    Logger.debug("init opencode-mcp-tool with HTTP transport (multi-server mode, no CLI model needed)");
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
    Logger.log(`OpenCode server API tools enabled - connecting to: ${options.opencodeUrl}`);
    if (options.opencodeInsecure) {
      Logger.warn("WARNING: SSL certificate verification is disabled (--opencode-insecure). This should only be used for development/testing.");
    }
  } else {
    Logger.debug("OpenCode server API tools disabled (no --opencode-url or --servers-config provided)");
  }

  const bearerToken = options.bearerToken;
  const debug = options.debug || DEBUG_MODE;

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (debug) {
      Logger.debug(`=== INCOMING REQUEST ===`);
      Logger.debug(`Method: ${req.method}`);
      Logger.debug(`URL: ${req.url}`);
      Logger.debug(`Remote Address: ${req.socket.remoteAddress}`);
      Logger.debug(`Headers:`, req.headers);
      Logger.debug(`All header keys:`, Object.keys(req.headers));
    }

    const originalWriteHead = res.writeHead;
    res.writeHead = function(statusCode: number, statusMessageOrHeaders?: string | any, headers?: any) {
      let combinedHeaders: any;

      if (typeof statusMessageOrHeaders === 'object') {
        combinedHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, content-type, accept',
          ...statusMessageOrHeaders
        };
        return (originalWriteHead as any).call(res, statusCode, combinedHeaders);
      } else {
        combinedHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, content-type, accept',
          ...(headers || {})
        };
        return (originalWriteHead as any).call(res, statusCode, statusMessageOrHeaders || '', combinedHeaders);
      }
    } as any;

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (bearerToken) {
      const authHeader = req.headers.authorization;
      if (debug) {
        const hasAuth = !!authHeader;
        const authType = authHeader?.split(' ')[0] || 'none';
        Logger.debug(`Authorization header present: ${hasAuth}, type: ${authType}`);
      }

      if (!authHeader) {
        Logger.warn(`Unauthorized request from ${req.socket.remoteAddress}: Missing Authorization header`);
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }));
        return;
      }

      if (!authHeader.toLowerCase().startsWith("bearer ")) {
        Logger.warn(`Unauthorized request from ${req.socket.remoteAddress}: Invalid Authorization type (expected Bearer)`);
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized: Invalid Authorization type (expected Bearer token)" }));
        return;
      }

      const providedToken = authHeader.substring(7);
      if (providedToken !== bearerToken) {
        Logger.warn(`Unauthorized request from ${req.socket.remoteAddress}: Tokens do not match`);
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized: Invalid bearer token" }));
        return;
      }

      if (debug) {
        Logger.debug(`Bearer token validated successfully`);
      }
    }
    await transport.handleRequest(req, res);
  });

  httpServer.on('error', (error) => {
    Logger.error('HTTP server error:', error);
  });

  await server.connect(transport);

  const port = parseInt(options.port, 10);
  const host = options.host;

  httpServer.listen(port, host, () => {
    Logger.log(`opencode-mcp-tool HTTP server listening on http://${host}:${port}`);
    
    // Start config watcher if using multi-server mode
    if (options.serversConfig) {
      startConfigWatcher(options.serversConfig);
    }
    
    const cleanup = () => {
      Logger.log('Shutting down gracefully...');
      if (options.serversConfig) {
        stopConfigWatcher();
      }
      httpServer.close(() => {
        Logger.log('HTTP server closed');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  });
}

main().catch((error) => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});
