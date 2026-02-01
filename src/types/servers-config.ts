export interface ServerEntry {
  id: string;
  title: string;
  description: string;
  url: string;
  password: string;
  status: 'active' | 'inactive';
  added_at: string;
}

export interface ServersConfig {
  version: string;
  servers: ServerEntry[];
  default_server?: string;
}
