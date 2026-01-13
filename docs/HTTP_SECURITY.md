# HTTP Transport with Security

## MCP_API_KEY Authentication

When running the HTTP server on a public interface (0.0.0.0), you can secure access using the `--mcp-api-key` option.

### Usage

```bash
# Start server with API key
node dist/index-http.js --model <model> --mcp-api-key YOUR_SECRET_KEY

# Or from package.json
npm run dev:http -- --mcp-api-key YOUR_SECRET_KEY
```

### Client Usage

Clients must include the `MCP-API-KEY` header with their requests:

```bash
curl -H 'MCP-API-KEY: YOUR_SECRET_KEY' \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream, application/json' \
  http://your-server:3005/mcp -X POST -d '{...}'
```

### Authentication Behavior

- **Valid API key** → Request passes through to MCP server
- **Invalid API key** → 401 Unauthorized
- **Missing API key** (when server started with one) → 401 Unauthorized
- **No API key configured** on server → All requests accepted (no authentication)

### Example with OpenCode

```bash
# Start OpenCode MCP server with authentication
node dist/index-http.js \
  --model MoJoLLM/zai-org/glm-4.6v-flash \
  --mcp-api-key mysecret123

# Test from another machine
curl -H 'MCP-API-KEY: mysecret123' \
  -H 'Accept: text/event-stream, application/json' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' \
  http://your-public-ip:3005/mcp -X POST
```
