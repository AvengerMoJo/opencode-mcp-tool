# Fix: Duplicate Tool Registration

## Issue

User reports seeing 38 tools when only 20 should be registered.

## Root Cause

`registerTool()` in `src/tools/registry.ts` has **no duplicate check**:

```typescript
export function registerTool(tool: UnifiedTool) {
  if (toolRegistry.length === 0) {
    toolRegistry = [];
  }
  toolRegistry.push(tool);  // ← Pushes even if tool already exists!
}
```

If tools are registered multiple times (hot reload, module re-import, etc.), duplicates accumulate.

## Fix

Add duplicate check:

```typescript
export function registerTool(tool: UnifiedTool) {
  // Check if tool already registered
  const existingIndex = toolRegistry.findIndex(t => t.name === tool.name);

  if (existingIndex >= 0) {
    // Replace existing tool (allows hot reload to update tools)
    toolRegistry[existingIndex] = tool;
    Logger.debug(`Updated tool: ${tool.name}`);
  } else {
    // Add new tool
    toolRegistry.push(tool);
    Logger.debug(`Registered new tool: ${tool.name}`);
  }
}
```

## Verification Test

```bash
# Check tool count via MCP protocol
curl -s -X POST \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  https://opencode.eclipsogate.org/mcp/v1/tools/list \
  -d '{}' | jq '.tools | length'

# Expected: 20
# Before fix: 38-40
```

## Apply Fix

1. Edit `src/tools/registry.ts` lines 27-32
2. Run `npm run build`
3. Restart global MCP tool:
   ```bash
   python3 -c "
   import asyncio, sys
   sys.path.insert(0, '/home/alex/Development/Personal/MoJoAssistant')
   from app.mcp.opencode.manager import OpenCodeManager
   asyncio.run(OpenCodeManager().restart_mcp_tool())
   "
   ```
4. Re-test tool count

## Related Files

- `src/tools/registry.ts` - Tool registration logic
- `src/tools/index.ts` - Main registration file (used by server)
- `src/tools/register-all.ts` - Duplicate? Consider removing

## Questions

1. **Why does `register-all.ts` exist?** It's identical to `index.ts`
2. **Is it imported anywhere?** If not, should be deleted
3. **Could tools be registered from both files?** Check import paths
