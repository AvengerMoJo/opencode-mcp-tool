/**
 * Configuration for OpenCode Server connection
 * Used when wrapping OpenCode server API calls
 * Supports both single-server mode (CLI flags) and multi-server mode (config file)
 */

import { OpenCodeClient, OpenCodeClientConfig } from "./utils/opencode-client.js";
import { getClient as getMultiServerClient, isMultiServerEnabled } from "./opencode-server-registry.js";

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

export function getOpenCodeClient(serverId?: string): OpenCodeClient {
  if (isMultiServerEnabled()) {
    return getMultiServerClient(serverId);
  }
  
  if (!opencodeClient) {
    throw new Error(
      "OpenCode client not initialized. Use --opencode-url to configure connection."
    );
  }
  return opencodeClient;
}

export function isOpenCodeServerConfigured(): boolean {
  if (isMultiServerEnabled()) {
    return true;
  }
  return opencodeServerConfig !== null && opencodeClient !== null;
}

export { isMultiServerEnabled };
