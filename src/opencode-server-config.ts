/**
 * Configuration for OpenCode Server connection
 * Used when wrapping OpenCode server API calls
 */

import { OpenCodeClient, OpenCodeClientConfig } from "./utils/opencode-client.js";

let opencodeServerConfig: OpenCodeClientConfig | null = null;
let opencodeClient: OpenCodeClient | null = null;

export function setOpenCodeServerConfig(config: OpenCodeClientConfig): void {
  opencodeServerConfig = config;
  opencodeClient = new OpenCodeClient(config);
}

export function getOpenCodeServerConfig(): OpenCodeClientConfig {
  if (!opencodeServerConfig) {
    throw new Error(
      "OpenCode server configuration not set. Use --opencode-url to configure connection."
    );
  }
  return opencodeServerConfig;
}

export function getOpenCodeClient(): OpenCodeClient {
  if (!opencodeClient) {
    throw new Error(
      "OpenCode client not initialized. Use --opencode-url to configure connection."
    );
  }
  return opencodeClient;
}

export function isOpenCodeServerConfigured(): boolean {
  return opencodeServerConfig !== null && opencodeClient !== null;
}
