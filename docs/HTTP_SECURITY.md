# HTTP Transport with Security

## Bearer Token Authentication (Standard)

This server uses industry-standard OAuth 2.0 Bearer token authentication via the `Authorization` header.

### Usage

```bash
# Start server with bearer token
node dist/index-http.js --model <model> --bearer-token YOUR_SECRET_TOKEN

# Or from package.json
npm run dev:http -- --bearer-token YOUR_SECRET_TOKEN
```

### Client Usage

Clients must include the `Authorization: Bearer <token>` header:

```bash
curl -H 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream, application/json' \
  http://your-server:3005/mcp -X POST -d '{...}'
```

### Authentication Behavior

- **Valid bearer token** → Request passes through to MCP server
- **Invalid token** → 401 Unauthorized with details
- **Missing Authorization header** → 401 Unauthorized (when server requires auth)
- **No token configured** on server → All requests accepted (no authentication)

### Why Bearer Token?

- ✅ **Industry Standard** - OAuth 2.0 (RFC 6750)
- ✅ **Universal Support** - Works with curl, axios, fetch, Postman, etc.
- ✅ **Tool Support** - Built into most HTTP clients
- ✅ **Professional** - Recognized as best practice
- ✅ **Middleware Compatible** - Works with passport, express-auth, etc.

### Debug Mode

Enable verbose logging to see authentication details:

```bash
# Using --debug flag
node dist/index-http.js --model <model> --bearer-token <token> --debug

# Using environment variable
DEBUG=true node dist/index-http.js --model <model> --bearer-token <token>
```

Example debug output:
```
[OMCPT] === INCOMING REQUEST ===
[OMCPT] Method: POST
[OMCPT] URL: /mcp
[OMCPT] Remote Address: 127.0.0.1
[OMCPT] Authorization header: Bearer mysecret123
[OMCPT] Bearer token validated successfully
```

### Example with OpenCode

```bash
# Start OpenCode MCP server with bearer token authentication
node dist/index-http.js \
  --model MoJoLLM/zai-org/glm-4.6v-flash \
  --bearer-token mysecret123

# Test from another machine
curl -H 'Authorization: Bearer mysecret123' \
  -H 'Accept: text/event-stream, application/json' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' \
  http://your-public-ip:3005/mcp -X POST
```

### Comparison: Bearer vs Custom Headers

| Feature | Bearer Token | Custom Header (old MCP-API-KEY) |
|---------|--------------|-----------------------------------|
| Standard | OAuth 2.0 ✅ | Custom ❌ |
| Client Support | Auto ✅ | Manual ❌ |
| Middleware | passport ✅ | Custom needed ❌ |
| Professional | High ✅ | Medium ⚠️ |

With debug enabled, you'll see:
- Request method and URL
- Remote address of client
- All HTTP headers
- API key validation status

Example debug output:
```
[OMCPT] POST /mcp from 127.0.0.1
[OMCPT] Headers: {"content-type":"application/json","accept":"text/event-stream, application/json","mcp-api-key":"secret123"}
[OMCPT] API key validated successfully
```

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
