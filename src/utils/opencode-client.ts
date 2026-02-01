/**
 * HTTP client for OpenCode Server API
 * Wraps calls to a running OpenCode server instance (opencode serve)
 */

import https from 'node:https';

export interface OpenCodeClientConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  rejectUnauthorized?: boolean; // Set to false to allow self-signed certs (dev only)
}

export interface OpenCodeSession {
  id: string;
  parentID?: string;
  createdAt: string;
  updatedAt: string;
  messages: OpenCodeMessage[];
}

export interface OpenCodeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface OpenCodeHealthResponse {
  status: string;
  version?: string;
}

export class OpenCodeClient {
  private config: OpenCodeClientConfig;

  constructor(config: OpenCodeClientConfig) {
    this.config = config;
  }

  private getAuthHeader(): string | undefined {
    if (this.config.username && this.config.password) {
      const credentials = Buffer.from(
        `${this.config.username}:${this.config.password}`
      ).toString('base64');
      return `Basic ${credentials}`;
    }
    return undefined;
  }

  private async fetch(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const authHeader = this.getAuthHeader();
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const fetchOptions: RequestInit & { agent?: https.Agent } = {
      ...options,
      headers,
    };

    // Allow self-signed certificates if configured (dev/testing only)
    if (this.config.rejectUnauthorized === false) {
      fetchOptions.agent = new https.Agent({
        rejectUnauthorized: false,
      });
    }

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (error: any) {
      throw new Error(
        `Failed to connect to OpenCode server at ${url}: ${error.message}. ` +
        `Ensure the server is running and the URL is correct. ` +
        `If using HTTPS with self-signed certificates, add --opencode-insecure flag.`
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenCode API error (${response.status}): ${errorText}`
      );
    }

    return response;
  }

  // Health check
  async health(): Promise<OpenCodeHealthResponse> {
    const response = await this.fetch('/global/health');
    return response.json();
  }

  // Session management
  async createSession(parentID?: string): Promise<OpenCodeSession> {
    const response = await this.fetch('/session', {
      method: 'POST',
      body: JSON.stringify({ parentID }),
    });
    return response.json();
  }

  async getSession(sessionId: string): Promise<OpenCodeSession> {
    const response = await this.fetch(`/session/${sessionId}`);
    return response.json();
  }

  async listSessions(): Promise<OpenCodeSession[]> {
    const response = await this.fetch('/session');
    return response.json();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.fetch(`/session/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async forkSession(
    sessionId: string,
    messageId: string
  ): Promise<OpenCodeSession> {
    const response = await this.fetch(`/session/${sessionId}/fork`, {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    });
    return response.json();
  }

  // Message operations
  async sendMessage(
    sessionId: string,
    content: string
  ): Promise<OpenCodeMessage> {
    const response = await this.fetch(`/session/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ parts: [{ type: 'text', text: content }] }),
    });
    return response.json();
  }

  async getMessages(sessionId: string): Promise<OpenCodeMessage[]> {
    const response = await this.fetch(`/session/${sessionId}/message`);
    return response.json();
  }

  // File operations
  async findFiles(query: string): Promise<string[]> {
    const response = await this.fetch(
      `/find/file?query=${encodeURIComponent(query)}`
    );
    return response.json();
  }

  async searchContent(pattern: string): Promise<any[]> {
    const response = await this.fetch(
      `/find?pattern=${encodeURIComponent(pattern)}`
    );
    return response.json();
  }

  async getFileContent(path: string): Promise<string> {
    const response = await this.fetch(
      `/file/content?path=${encodeURIComponent(path)}`
    );
    return response.text();
  }

  // Configuration
  async getConfig(): Promise<any> {
    const response = await this.fetch('/config');
    return response.json();
  }

  async updateConfig(config: any): Promise<any> {
    const response = await this.fetch('/config', {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
    return response.json();
  }

  // Providers
  async listProviders(): Promise<any[]> {
    const response = await this.fetch('/provider');
    return response.json();
  }
}
