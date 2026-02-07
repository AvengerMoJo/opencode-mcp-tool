# Disable CLI-Based Tools for Web Server Mode

## The Problem

The opencode-mcp-tool has tools that spawn `opencode run` CLI processes:
- `build` - Calls `opencode run --agent build`
- `plan` - Calls `opencode run --agent plan`

**Why this is wrong**:
- OpenCode Manager runs web servers (HTTP API)
- CLI processes bypass the web server
- They spawn separate conflicting instances
- Not the N:1 architecture (multiple CLI processes vs 1 web server)
- Processes can get stuck and accumulate

## The Solution

**Option 1: Disable CLI Tools** (Quick Fix)

Comment out tool registration in:
- `src/tools/slash-commands.tool.ts`
- `src/tools/ask-opencode.tool.ts`

```typescript
// Disable CLI-based tools - use session API instead
// registerTool(opencodePlanTool);
// registerTool(opencodeBuildTool);
```

**Option 2: Replace with Session API** (Proper Fix)

Use the session-based tools instead:
- `opencode-session-message` - Send messages to web server session
- `opencode-session-create` - Create new session
- `opencode-session-list` - List sessions

These tools use HTTP API and work with the web server.

## What to Use Instead

### Before (CLI - Wrong)
```javascript
// MCP client calls:
tool: "build"
args: { prompt: "List git branches" }

// Result: Spawns `opencode run --agent build "List git branches"`
// ❌ Separate process, bypasses web server, can get stuck
```

### After (Session API - Correct)
```javascript
// MCP client calls:
tool: "opencode-session-message"
args: {
  server: "my-project",
  sessionId: "ses_abc123",
  content: "List git branches"
}

// Result: HTTP POST to web server session endpoint
// ✅ Uses web server, part of N:1 architecture, tracked properly
```

## Files to Modify

### 1. Disable in slash-commands.tool.ts

```typescript
// src/tools/slash-commands.tool.ts

// Comment out at bottom:
// registerTool(opencodePlanTool);  // ← Disable this
// registerTool(opencodeBuildTool); // ← Disable this
```

### 2. Disable in ask-opencode.tool.ts

Check if this file also registers CLI tools and disable them.

### 3. Document in README

Add note:
```markdown
## Note: CLI Tools Disabled

The `build` and `plan` tools are disabled in web server mode.
Use session-based tools instead:
- opencode-session-message
- opencode-session-create
- opencode-session-list
```

## Why Session API is Better

| CLI Tools | Session API |
|-----------|-------------|
| Spawn separate processes | Uses web server HTTP API |
| Can get stuck | Proper timeout handling |
| No context preservation | Session maintains context |
| Race conditions | Single web server, no conflicts |
| Hard to debug | Web server logs everything |

## Testing After Disabling

1. **Verify tools are gone**:
   ```bash
   # Start opencode-mcp-tool
   # List tools - should NOT see "build" or "plan"
   ```

2. **Use session API instead**:
   ```bash
   # Create session
   tool: opencode-session-create

   # Send message
   tool: opencode-session-message
   args: { sessionId: "ses_xxx", content: "List git branches" }
   ```

3. **Check no CLI processes**:
   ```bash
   ps aux | grep "opencode run" | grep -v grep
   # Should only see legitimate processes (language servers, etc.)
   ```

## Summary

**Problem**: CLI tools spawn conflicting processes
**Solution**: Disable CLI tools, use session API
**Benefit**: Clean N:1 architecture, no stuck processes

---

**Action**: Edit `src/tools/slash-commands.tool.ts` and comment out `registerTool()` calls.
