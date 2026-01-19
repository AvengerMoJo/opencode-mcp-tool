export interface ServerConfig {
  primaryModel: string;
  fallbackModel?: string;
}

export let serverConfig: ServerConfig;

export function setServerConfig(config: ServerConfig): void {
  serverConfig = config;
}

export function getServerConfig(): ServerConfig {
  if (!serverConfig || !serverConfig.primaryModel) {
    throw new Error("Server configuration not initialized. Call setServerConfig() first.");
  }
  return serverConfig;
}
