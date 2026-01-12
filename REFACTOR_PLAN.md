# OpenCode Server API Integration Plan

## Current Approach (CLI-based)
```
MCP Server → opencode CLI → OpenCode Server
```

## Proposed Approaches

### Option 1: ACP (Agent Client Protocol)
```bash
opencode acp --port 3007
```
- Needs connection first (not a REST API)
- Might be WebSocket-based
- Needs more investigation

### Option 2: Direct Server Integration
- OpenCode Server already has MCP support configured
- Could use existing MCP protocol layer
- Better session management

### Option 3: Hybrid Approach
- Use OpenCode's existing MCP infrastructure
- Create tools that delegate to OpenCode's MCP layer
- Maintain session state through OpenCode

## Questions
1. Do you have ACP protocol documentation?
2. Should we integrate with OpenCode's built-in MCP system?
3. Or should we build a custom HTTP client to OpenCode Server?

## Next Steps
Need to investigate:
- ACP protocol specifications
- OpenCode's internal MCP API
- WebSocket endpoints if any
