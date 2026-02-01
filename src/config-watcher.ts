import fs from 'node:fs';
import { Logger } from './utils/logger.js';
import { serversConfigSchema } from './types/servers-config.zod.js';
import { initializeServerRegistry, getAvailableServers } from './opencode-server-registry.js';
import type { ServersConfig } from './types/servers-config.js';

let watchHandle: fs.FSWatcher | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

export async function startConfigWatcher(configPath: string, onReload?: (config: ServersConfig) => void): Promise<void> {
  try {
    watchHandle = fs.watch(configPath, { persistent: true }, async (eventType) => {
      if (eventType !== 'change') return;
      
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(async () => {
        try {
          await reloadConfig(configPath);
          if (onReload) {
            const content = await fs.promises.readFile(configPath, 'utf-8');
            const config = serversConfigSchema.parse(JSON.parse(content));
            onReload(config);
          }
        } catch (error) {
          Logger.error(`Failed to reload server config: ${error instanceof Error ? error.message : String(error)}`);
        }
      }, 2000);
    });
    
    Logger.log(`Configuration watcher started for: ${configPath}`);
  } catch (error) {
    throw new Error(`Failed to start config watcher: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function stopConfigWatcher(): void {
  if (watchHandle) {
    watchHandle.close();
    watchHandle = null;
    Logger.log('Configuration watcher stopped');
  }
  
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

async function reloadConfig(configPath: string): Promise<ServersConfig> {
  try {
    const content = await fs.promises.readFile(configPath, 'utf-8');
    const config = serversConfigSchema.parse(JSON.parse(content));
    
    initializeServerRegistry(config);
    
    const serverCount = config.servers.length;
    const activeCount = config.servers.filter(s => s.status === 'active').length;
    const defaultServer = config.default_server || 'none (first active)';
    
    Logger.log(`Server configuration reloaded: ${activeCount}/${serverCount} active servers, default: ${defaultServer}`);
    
    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse server config: ${error.message}`);
    }
    throw error;
  }
}

export async function loadInitialConfig(configPath: string): Promise<ServersConfig> {
  try {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    
    return await reloadConfig(configPath);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load initial config: ${error.message}`);
    }
    throw error;
  }
}
