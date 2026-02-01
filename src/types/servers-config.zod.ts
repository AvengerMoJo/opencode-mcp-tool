import { z } from 'zod';
import type { ServerEntry, ServersConfig } from './servers-config.js';

export const serverEntrySchema = z.object({
  id: z.string().min(1, 'Server ID is required'),
  title: z.string().min(1, 'Server title is required'),
  description: z.string().min(1, 'Server description is required'),
  url: z.string().url('Server URL must be a valid URL'),
  password: z.string().min(1, 'Server password is required'),
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Status must be "active" or "inactive"' })
  }),
  added_at: z.string().datetime('added_at must be a valid ISO 8601 datetime')
});

export const serversConfigSchema = z.object({
  version: z.string().min(1, 'Config version is required'),
  servers: z.array(serverEntrySchema).min(1, 'At least one server must be configured'),
  default_server: z.string().optional()
}).refine(
  (data) => {
    if (!data.default_server) return true;
    return data.servers.some(s => s.id === data.default_server);
  },
  { message: 'default_server must match one of the server IDs' }
);

export type ServersConfigInput = z.input<typeof serversConfigSchema>;
export type ServersConfigOutput = z.output<typeof serversConfigSchema>;
