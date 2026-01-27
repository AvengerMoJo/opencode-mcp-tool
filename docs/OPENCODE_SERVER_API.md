# OpenCode Server API Integration

This feature allows the MCP server to connect to and interact with a running OpenCode server instance (`opencode serve`), enabling AI assistants to leverage OpenCode's full web API through MCP tools.

## Overview

The OpenCode Server API wrapper provides MCP tools that call the OpenCode HTTP API endpoints, allowing AI models to:
- Create and manage sessions
- Send messages and get responses
- Search and read files from the workspace
- Query server configuration and status
- List available AI providers

## Quick Start

### 1. Start OpenCode Server

First, start an OpenCode server instance:

```bash
# Basic server (no authentication)
opencode serve

# With authentication
OPENCODE_SERVER_PASSWORD=mysecretpass opencode serve

# Custom port and hostname
opencode serve --port 8080 --hostname 0.0.0.0
```

### 2. Start MCP Server with OpenCode Connection

#### For HTTP Transport

```bash
opencode-mcp-http \
  --model google/gemini-2.5-pro \
  --opencode-url http://localhost:4096 \
  --opencode-password mysecretpass
```

#### For stdio Transport (Claude Desktop, etc.)

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "opencode-with-server": {
      "command": "npx",
      "args": [
        "-y",
        "@gilby125/opencode-mcp-tool",
        "--",
        "--model", "google/gemini-2.5-pro",
        "--opencode-url", "http://localhost:4096",
        "--opencode-password", "mysecretpass"
      ]
    }
  }
}
```

## Configuration Options

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `--opencode-url` | OpenCode server base URL | - | Yes (to enable API tools) |
| `--opencode-username` | HTTP Basic Auth username | `opencode` | No |
| `--opencode-password` | HTTP Basic Auth password | - | Only if server requires auth |

**Note:** If `--opencode-url` is not provided, the OpenCode server API tools will be disabled and only the standard OpenCode CLI tools will be available.

## Available MCP Tools

### Session Management

#### `opencode-session-create`
Create a new session on the OpenCode server.

**Parameters:**
- `parentID` (optional): Parent session ID for hierarchical sessions

**Example:**
```typescript
{
  "name": "opencode-session-create",
  "arguments": {}
}
```

#### `opencode-session-list`
List all active sessions.

**Example:**
```typescript
{
  "name": "opencode-session-list",
  "arguments": {}
}
```

#### `opencode-session-get`
Get details of a specific session including its messages.

**Parameters:**
- `sessionId` (required): The session ID to retrieve

**Example:**
```typescript
{
  "name": "opencode-session-get",
  "arguments": {
    "sessionId": "session-123"
  }
}
```

#### `opencode-session-delete`
Delete a session from the server.

**Parameters:**
- `sessionId` (required): The session ID to delete

**Example:**
```typescript
{
  "name": "opencode-session-delete",
  "arguments": {
    "sessionId": "session-123"
  }
}
```

### Message Operations

#### `opencode-session-message`
Send a message to an OpenCode session and get a response.

**Parameters:**
- `sessionId` (required): The session ID
- `content` (required): The message content to send

**Example:**
```typescript
{
  "name": "opencode-session-message",
  "arguments": {
    "sessionId": "session-123",
    "content": "Explain the main function in app.js"
  }
}
```

#### `opencode-session-messages`
Get all messages from a session.

**Parameters:**
- `sessionId` (required): The session ID

**Example:**
```typescript
{
  "name": "opencode-session-messages",
  "arguments": {
    "sessionId": "session-123"
  }
}
```

### File Operations

#### `opencode-find-files`
Search for files in the OpenCode server's workspace.

**Parameters:**
- `query` (required): File name or pattern to search for

**Example:**
```typescript
{
  "name": "opencode-find-files",
  "arguments": {
    "query": "*.ts"
  }
}
```

#### `opencode-search-content`
Search for text patterns within files.

**Parameters:**
- `pattern` (required): Text pattern to search for

**Example:**
```typescript
{
  "name": "opencode-search-content",
  "arguments": {
    "pattern": "TODO:"
  }
}
```

#### `opencode-file-content`
Read the contents of a file from the workspace.

**Parameters:**
- `path` (required): Path to the file to read

**Example:**
```typescript
{
  "name": "opencode-file-content",
  "arguments": {
    "path": "src/index.ts"
  }
}
```

### Server Status & Configuration

#### `opencode-server-health`
Check the health and status of the connected OpenCode server.

**Example:**
```typescript
{
  "name": "opencode-server-health",
  "arguments": {}
}
```

#### `opencode-config-get`
Get the current configuration from the OpenCode server.

**Example:**
```typescript
{
  "name": "opencode-config-get",
  "arguments": {}
}
```

#### `opencode-providers-list`
List all available AI providers configured on the OpenCode server.

**Example:**
```typescript
{
  "name": "opencode-providers-list",
  "arguments": {}
}
```

## Usage Workflows

### Basic Workflow: Query Files and Get Analysis

1. **Check server health:**
   ```
   Use opencode-server-health to verify connection
   ```

2. **Find relevant files:**
   ```
   Use opencode-find-files with query "*.js"
   ```

3. **Read file content:**
   ```
   Use opencode-file-content with path "src/app.js"
   ```

4. **Create session and analyze:**
   ```
   Use opencode-session-create
   Use opencode-session-message with sessionId and content "Explain this code..."
   ```

### Advanced Workflow: Multi-Turn Conversation

1. **Create a session:**
   ```
   Use opencode-session-create → returns session-123
   ```

2. **Send first message:**
   ```
   Use opencode-session-message with sessionId "session-123" and content "What files are in this project?"
   ```

3. **Continue conversation:**
   ```
   Use opencode-session-message with sessionId "session-123" and content "Explain the main entry point"
   ```

4. **Review conversation history:**
   ```
   Use opencode-session-messages with sessionId "session-123"
   ```

5. **Clean up:**
   ```
   Use opencode-session-delete with sessionId "session-123"
   ```

## Error Handling

If the OpenCode server is not configured or unreachable, tools will return an error message:

```
OpenCode server not configured. Please start the MCP server with --opencode-url flag.
Example: --opencode-url http://localhost:4096 --opencode-username opencode --opencode-password yourpassword
```

## Architecture

### Components

1. **OpenCodeClient** (`src/utils/opencode-client.ts`)
   - HTTP client for making requests to OpenCode server
   - Handles authentication (HTTP Basic Auth)
   - Provides typed methods for all API endpoints

2. **OpenCode Server Config** (`src/opencode-server-config.ts`)
   - Manages connection configuration
   - Singleton pattern for client instance
   - Validation and error handling

3. **MCP Tools** (`src/tools/opencode-server.tool.ts`)
   - 12 MCP tools wrapping OpenCode API endpoints
   - Zod schema validation for all parameters
   - Progress reporting support

### Data Flow

```
AI Assistant
    ↓
MCP Tool Call
    ↓
OpenCodeClient
    ↓
HTTP Request (with auth)
    ↓
OpenCode Server API
    ↓
Response (JSON)
    ↓
MCP Tool Response
    ↓
AI Assistant
```

## Security Considerations

1. **Authentication**: Always use a strong password when running OpenCode server with authentication
2. **Network**: Consider running on localhost or using HTTPS for remote connections
3. **Credentials**: Store passwords in environment variables, not in configuration files
4. **Access Control**: The MCP server inherits the permissions of the OpenCode server user

## Troubleshooting

### Connection Refused

```
Error: OpenCode API error (ECONNREFUSED)
```

**Solution:** Ensure OpenCode server is running:
```bash
opencode serve --port 4096
```

### Authentication Failed

```
Error: OpenCode API error (401): Unauthorized
```

**Solution:** Check password matches:
```bash
# Server
OPENCODE_SERVER_PASSWORD=mypass opencode serve

# MCP
--opencode-password mypass
```

### Tools Not Available

**Solution:** Ensure `--opencode-url` is provided when starting the MCP server.

## Future Enhancements

Potential future additions:
- Session forking support
- Session sharing capabilities
- Diff generation endpoint
- Real-time SSE event streaming
- Command execution in sessions
- LSP and formatter status endpoints
- Provider authentication management
- Configuration updates (PATCH /config)

## Related Documentation

- [OpenCode Server Documentation](https://opencode.ai/docs/server/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- Main README: [../README.md](../README.md)
