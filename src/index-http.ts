#!/usr/bin/env node

import { Command } from "commander";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import { Logger } from "./utils/logger.js";
import { setServerConfig, getServerConfig } from "./config.js";
import { createMCPServer, setupProgressNotifications, setupRequestHandlers } from "./server-core.js";

const DEBUG_MODE = process.env.DEBUG === "true";

const server = createMCPServer();
setupProgressNotifications(server);
setupRequestHandlers(server, setupProgressNotifications(server));

async function main() {
  const program = new Command();

  program
    .name("opencode-mcp-http")
    .description("MCP server for OpenCode CLI integration with HTTP transport")
    .version("1.1.4")
    .requiredOption("-m, --model <model>", "Primary model to use (e.g., google/gemini-2.5-pro)")
    .option("-f, --fallback-model <model>", "Fallback model for quota/error situations")
    .option("-t, --bearer-token <token>", "Bearer token for authentication (Authorization: Bearer <token>)")
    .option("-p, --port <port>", "HTTP server port", "3005")
    .option("-h, --host <host>", "HTTP server host", "0.0.0.0")
    .option("-d, --debug", "Enable debug logging")
    .parse(process.argv);

  const options = program.opts();

  setServerConfig({
    primaryModel: options.model,
    fallbackModel: options.fallbackModel
  });

  const config = getServerConfig();

  Logger.debug("init opencode-mcp-tool with HTTP transport, model:", config.primaryModel);
  if (config.fallbackModel) {
    Logger.debug("fallback model:", config.fallbackModel);
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
        Logger.debug(`Authorization header:`, authHeader);
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
        Logger.warn(`Unauthorized request from ${req.socket.remoteAddress}: Invalid token`);
        Logger.warn(`Expected: ${bearerToken.substring(0, 8)}..., Got: ${providedToken.substring(0, 8)}...`);
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
    process.on('SIGTERM', () => {
      Logger.log('SIGTERM received, shutting down gracefully...');
      httpServer.close(() => {
        Logger.log('HTTP server closed');
	process.exit(0);
      });
    });
    process.on('SIGINT', () => {
      Logger.log('SIGINT received, shutting down gracefully...');
      httpServer.close(() => {
        Logger.log('HTTP server closed');
	process.exit(0);
      });
    });
  });
}

main().catch((error) => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});
