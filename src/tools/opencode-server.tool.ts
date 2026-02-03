/**
 * MCP tools for wrapping OpenCode Server API
 * These tools call a running OpenCode server instance
 */

import { z } from "zod";
import { UnifiedTool, registerTool } from "./registry.js";
import { getOpenCodeClient, isOpenCodeServerConfigured, isMultiServerEnabled } from "../opencode-server-config.js";

// Helper to check if OpenCode server is configured
function ensureConfigured(): void {
  if (!isOpenCodeServerConfigured()) {
    throw new Error(
      "OpenCode server not configured. Please start the MCP server with --opencode-url or --servers-config flag."
    );
  }
}

// Health check tool
const healthCheckSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)")
});

export const opencodeHealthTool: UnifiedTool = {
  name: "opencode-server-health",
  description: "Check health and status of the connected OpenCode server",
  zodSchema: healthCheckSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = healthCheckSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress("Checking OpenCode server health...\n");
    }

    const health = await client.health();

    return JSON.stringify(health, null, 2);
  },
};

// Create session tool
const createSessionSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)"),
  parentID: z.string().optional().describe("Optional parent session ID for hierarchical sessions"),
});

export const opencodeCreateSessionTool: UnifiedTool = {
  name: "opencode-session-create",
  description: "Create a new session on the OpenCode server",
  zodSchema: createSessionSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = createSessionSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress("Creating new OpenCode session...\n");
    }

    const session = await client.createSession(validatedArgs.parentID);

    if (onProgress) {
      onProgress(`Session created with ID: ${session.id}\n`);
    }

    return JSON.stringify(session, null, 2);
  },
};

// List sessions tool
const listSessionsSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)")
});

export const opencodeListSessionsTool: UnifiedTool = {
  name: "opencode-session-list",
  description: "List all active sessions on the OpenCode server",
  zodSchema: listSessionsSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = listSessionsSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress("Fetching OpenCode sessions...\n");
    }

    const sessions = await client.listSessions();

    if (onProgress) {
      onProgress(`Found ${sessions.length} session(s)\n`);
    }

    return JSON.stringify(sessions, null, 2);
  },
};

// Get session tool
const getSessionSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)"),
  sessionId: z.string().describe("The session ID to retrieve"),
});

export const opencodeGetSessionTool: UnifiedTool = {
  name: "opencode-session-get",
  description: "Get details of a specific OpenCode session including its messages",
  zodSchema: getSessionSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = getSessionSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress(`Fetching session ${validatedArgs.sessionId}...\n`);
    }

    const session = await client.getSession(validatedArgs.sessionId);

    return JSON.stringify(session, null, 2);
  },
};

// Delete session tool
const deleteSessionSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)"),
  sessionId: z.string().describe("The session ID to delete"),
});

export const opencodeDeleteSessionTool: UnifiedTool = {
  name: "opencode-session-delete",
  description: "Delete a session from the OpenCode server",
  zodSchema: deleteSessionSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = deleteSessionSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress(`Deleting session ${validatedArgs.sessionId}...\n`);
    }

    await client.deleteSession(validatedArgs.sessionId);

    return `Session ${validatedArgs.sessionId} deleted successfully`;
  },
};

// Send message tool
const sendMessageSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)"),
  sessionId: z.string().describe("The session ID to send the message to"),
  content: z.string().describe("The message content to send"),
});

export const opencodeSendMessageTool: UnifiedTool = {
  name: "opencode-session-message",
  description: "Send a message to an OpenCode session and get a response",
  zodSchema: sendMessageSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = sendMessageSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress(`Sending message to session ${validatedArgs.sessionId}...\n`);
    }

    const message = await client.sendMessage(validatedArgs.sessionId, validatedArgs.content);

    if (onProgress) {
      onProgress("Message sent successfully\n");
    }

    return JSON.stringify(message, null, 2);
  },
};

// Get messages tool
const getMessagesSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)"),
  sessionId: z.string().describe("The session ID to get messages from"),
});

export const opencodeGetMessagesTool: UnifiedTool = {
  name: "opencode-session-messages",
  description: "Get all messages from an OpenCode session",
  zodSchema: getMessagesSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = getMessagesSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress(`Fetching messages from session ${validatedArgs.sessionId}...\n`);
    }

    const messages = await client.getMessages(validatedArgs.sessionId);

    if (onProgress) {
      onProgress(`Found ${messages.length} message(s)\n`);
    }

    return JSON.stringify(messages, null, 2);
  },
};

// Find files tool
const findFilesSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)"),
  query: z.string().describe("File name or pattern to search for"),
});

export const opencodeFindFilesTool: UnifiedTool = {
  name: "opencode-find-files",
  description: "Search for files in the OpenCode server's workspace",
  zodSchema: findFilesSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = findFilesSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress(`Searching for files matching: ${validatedArgs.query}...\n`);
    }

    const files = await client.findFiles(validatedArgs.query);

    if (onProgress) {
      onProgress(`Found ${files.length} file(s)\n`);
    }

    return JSON.stringify(files, null, 2);
  },
};

// Search content tool
const searchContentSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)"),
  pattern: z.string().describe("Text pattern to search for in file contents"),
});

export const opencodeSearchContentTool: UnifiedTool = {
  name: "opencode-search-content",
  description: "Search for text patterns within files in the OpenCode server's workspace",
  zodSchema: searchContentSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = searchContentSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress(`Searching for content pattern: ${validatedArgs.pattern}...\n`);
    }

    const results = await client.searchContent(validatedArgs.pattern);

    if (onProgress) {
      onProgress(`Found ${results.length} match(es)\n`);
    }

    return JSON.stringify(results, null, 2);
  },
};

// Get file content tool
const getFileContentSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)"),
  path: z.string().describe("Path to file to read"),
});

export const opencodeGetFileContentTool: UnifiedTool = {
  name: "opencode-file-content",
  description: "Read the contents of a file from the OpenCode server's workspace",
  zodSchema: getFileContentSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = getFileContentSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress(`Reading file: ${validatedArgs.path}...\n`);
    }

    const content = await client.getFileContent(validatedArgs.path);

    return content;
  },
};

// Get config tool
const getConfigSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)")
});

export const opencodeGetConfigTool: UnifiedTool = {
  name: "opencode-config-get",
  description: "Get the current configuration from the OpenCode server",
  zodSchema: getConfigSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = getConfigSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress("Fetching OpenCode configuration...\n");
    }

    const config = await client.getConfig();

    return JSON.stringify(config, null, 2);
  },
};

// List providers tool
const listProvidersSchema = z.object({
  server: z.string().optional().describe("OpenCode server ID (only in multi-server mode)")
});

export const opencodeListProvidersTool: UnifiedTool = {
  name: "opencode-providers-list",
  description: "List all available AI providers configured on the OpenCode server",
  zodSchema: listProvidersSchema,
  category: "opencode",
  execute: async (args, onProgress) => {
    ensureConfigured();
    const validatedArgs = listProvidersSchema.parse(args);
    const client = getOpenCodeClient(validatedArgs.server);

    if (onProgress) {
      onProgress("Fetching OpenCode providers...\n");
    }

    const providers = await client.listProviders();

    if (onProgress) {
      onProgress(`Found ${providers.length} provider(s)\n`);
    }

    return JSON.stringify(providers, null, 2);
  },
};

registerTool(opencodeHealthTool);
registerTool(opencodeCreateSessionTool);
registerTool(opencodeListSessionsTool);
registerTool(opencodeGetSessionTool);
registerTool(opencodeDeleteSessionTool);
registerTool(opencodeSendMessageTool);
registerTool(opencodeGetMessagesTool);
registerTool(opencodeFindFilesTool);
registerTool(opencodeSearchContentTool);
registerTool(opencodeGetFileContentTool);
registerTool(opencodeGetConfigTool);
registerTool(opencodeListProvidersTool);
