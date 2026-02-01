import { OpenCodeClient, OpenCodeClientConfig } from './utils/opencode-client.js';
import type { ServersConfig } from './types/servers-config.js';

const clients = new Map<string, OpenCodeClient>();
let defaultServerId: string | null = null;
let defaultClient: OpenCodeClient | null = null;
let isMultiServerMode = false;

export function initializeServerRegistry(config: ServersConfig): void {
  clients.clear();
  
  const activeServers = config.servers.filter(s => s.status === 'active');
  
  if (activeServers.length === 0) {
    throw new Error('No active servers found in configuration');
  }
  
  for (const serverConfig of activeServers) {
    const clientConfig: OpenCodeClientConfig = {
      baseUrl: serverConfig.url,
      username: 'opencode',
      password: serverConfig.password,
      rejectUnauthorized: true
    };
    
    const client = new OpenCodeClient(clientConfig);
    clients.set(serverConfig.id, client);
  }
  
  defaultServerId = config.default_server || activeServers[0].id;
  defaultClient = clients.get(defaultServerId) || null;
  isMultiServerMode = true;
}

export function getClient(serverId?: string): OpenCodeClient {
  if (!isMultiServerMode) {
    throw new Error('Multi-server mode not initialized. Use CLI flags or --servers-config to enable.');
  }
  
  if (serverId) {
    const client = clients.get(serverId);
    if (!client) {
      const available = Array.from(clients.keys()).join(', ');
      throw new Error(`OpenCode server not found: "${serverId}". Available servers: ${available}`);
    }
    return client;
  }
  
  if (defaultClient) {
    return defaultClient;
  }
  
  const available = Array.from(clients.keys()).join(', ');
  throw new Error(`No default OpenCode server configured. Available servers: ${available}. Specify a server ID or configure a default_server.`);
}

export function getAvailableServers(): string[] {
  return Array.from(clients.keys());
}

export function getDefaultServerId(): string | null {
  return defaultServerId;
}

export function isMultiServerEnabled(): boolean {
  return isMultiServerMode;
}

export function clearServerRegistry(): void {
  clients.clear();
  defaultServerId = null;
  defaultClient = null;
  isMultiServerMode = false;
}
