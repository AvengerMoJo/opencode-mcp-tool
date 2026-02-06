# OpenCode MCP Tool - Current State

**Date**: 2026-02-06
**Version**: 1.1.4
**Purpose**: Assessment of what's working and what needs attention

## ✅ What's Working (Verified)

### 1. Full Communication Chain

**Tested**: MCP Client → MCP Tool → OpenCode → Response

```
Test: opencode-server-health
Server: personal-update-version-of-chatmcp-client
Result: ✅ SUCCESS

Response:
{
  "healthy": true,
  "version": "1.1.49"
}
```

**Conclusion**: The infrastructure IS working! MCP tool successfully:
- Receives JSON-RPC requests
- Routes to correct OpenCode server (by server ID)
- Proxies requests to OpenCode API
- Returns responses in SSE format

### 2. Multi-Server Mode

**Status**: ✅ WORKING
- Config file: `~/.memory/opencode-mcp-tool-servers.json`
- Current servers: 1 (personal-update-version-of-chatmcp-client)
- Auto-reload: Working (config watcher active)
- Server routing: Working (tested with server parameter)

### 3. Authentication

**MCP Tool**:
- ✅ Bearer token authentication working
- ✅ Health endpoint unauthenticated (as intended)

**OpenCode**:
- ✅ HTTP Basic auth working (username: opencode, password from config)

### 4. Tool Registry

**Total tool files**: 5
- `opencode-server.tool.ts` - OpenCode API wrappers
- `ask-opencode.tool.ts` - Ask OpenCode queries
- `brainstorm.tool.ts` - Brainstorming tools
- `slash-commands.tool.ts` - CLI-style commands
- `timeout-test.tool.ts` - Test tool

**Duplicate tool bug**: ✅ FIXED (registry now replaces duplicates)

## ⚠️ What Needs Review

### 1. Session-Related Tools (Design Question)

**Current tools exposing OpenCode sessions**:
- `opencode-session-create` - Create new session
- `opencode-session-list` - List all sessions
- `opencode-session-messages` - Get all messages from session (⚠️ INEFFICIENT)
- `opencode-session-fork` - Fork a session
- `opencode-session-delete` - Delete session

**The Problem**:
```python
# opencode-session-messages returns ALL messages
sessions = await client.getMessages(session_id)
# Returns: [msg1, msg2, msg3, ..., msg100]
# LLM has to re-read everything every time!
```

**Why this is backwards**:
- OpenCode already maintains session context internally
- LLM (via MCP client) has its own context
- Returning all messages wastes:
  - Tokens (hundreds/thousands per call)
  - Context window
  - API costs
- OpenCode isn't stateless - it HAS the conversation history

**Questions**:
1. Should we even expose OpenCode's internal sessions to MCP clients?
2. Or should MCP clients just use file operations and let OpenCode handle sessions internally?
3. Is there a use case for session management via MCP?

### 2. File Operation Tools (Core Functionality)

**What's implemented** (from `opencode-server.tool.ts`):
- `opencode-find-files` - Find files by query
- `opencode-search-content` - Search file content
- `opencode-get-file` - Get file content
- Config operations
- Provider operations

**What we know works** (tested directly on OpenCode):
- ✅ `/find/file?query=` - Find files (works)
- ✅ `/file/content?path=` - Read files (works)
- ✅ `/config` - Get config (works)
- ❌ `/find?pattern=` - Content search (broken)
- ❌ `/provider` - List providers (broken)

**Action needed**:
- Test file operation tools through MCP
- Fix broken OpenCode APIs or disable broken tools

### 3. Tool Count Verification

**Expected**: 20 tools (from previous testing)
**Need to verify**: Current tool count after duplicate fix

**Action**: List all registered tools and verify count

## 📋 What Needs To Be Done

### Priority 1: Decide on Session Tools

**Options**:

**A) Remove session tools entirely**
- Reasoning: OpenCode manages sessions internally, MCP clients don't need this
- Focus: Just expose file operations
- Benefit: Simpler, clearer responsibility

**B) Keep but redesign session tools**
- Make them more efficient (don't return all messages)
- Add pagination/filtering
- Benefit: Flexibility for advanced use cases

**C) Keep as-is, document inefficiency**
- Mark as "advanced" or "experimental"
- Warn about token usage
- Benefit: No work needed, user choice

**Recommendation**: **Option A** - Keep it simple, focus on file operations

### Priority 2: Test File Operation Tools

**Test through MCP**:
```bash
# Test each file tool:
- opencode-find-files
- opencode-search-content
- opencode-get-file
```

**Verify**:
- Do they work end-to-end?
- Do they return correct data?
- Are responses formatted properly?

### Priority 3: Fix or Disable Broken Tools

**Known broken**:
- Content search (`/find?pattern=`) - OpenCode API returns empty
- Provider list (`/provider`) - OpenCode API returns empty

**Options**:
- Fix the OpenCode APIs (if possible)
- Disable the tools (remove from registry)
- Document as "not implemented"

### Priority 4: Clean Up Repository

**Files to handle**:
- `FIX_DUPLICATE_TOOLS.md` - Can commit or delete (bug fixed)
- `FUNCTIONALITY_ANALYSIS.md` - Keep, update with current findings
- `TEST_PLAN.md` - Keep, mark tests as done/pending
- `nohup.out` - Delete (should be in .gitignore)
- Modified `tests/tool-registry.test.ts` - Review changes

## 🎯 Recommended Next Steps

### Step 1: List All Tools (Verify Count)

Check current tool count and list what's actually registered.

### Step 2: Test File Operations End-to-End

Test the core file operation tools:
```python
test_tool("opencode-find-files", {"server": "...", "query": "README"})
test_tool("opencode-get-file", {"server": "...", "path": "README.md"})
```

### Step 3: Decide on Session Tools

Make a decision:
- Remove them? (simplest)
- Keep them? (document inefficiency)
- Redesign them? (most work)

### Step 4: Clean Up Broken Tools

Either fix or remove:
- `opencode-search-content` (if `/find?pattern=` broken)
- Provider-related tools (if `/provider` broken)

### Step 5: Documentation

Update:
- `FUNCTIONALITY_ANALYSIS.md` - Current accurate state
- `README.md` - What tools are actually available
- Remove obsolete docs

## 💡 Key Insight

**The infrastructure works!** The full chain (MCP Client → MCP Tool → OpenCode) is functional.

**The question isn't "does it work?"** - it does.

**The question is "what should it expose?"**:
- File operations? ✅ Yes (core functionality)
- OpenCode sessions? ⚠️ Maybe not needed
- Broken APIs? ❌ Fix or remove

## Summary

**Status**: Infrastructure working, need to clean up tool set

**Working**:
- ✅ MCP Tool → OpenCode communication
- ✅ Multi-server routing
- ✅ Authentication
- ✅ Config auto-reload
- ✅ Basic health checks

**Needs Decision**:
- ⚠️ Session management tools (keep/remove/redesign?)

**Needs Testing**:
- ⏳ File operation tools (likely work, need verification)

**Needs Cleanup**:
- ❌ Broken content search tool
- ❌ Broken provider tool
- ❌ Repository files (test files, docs)

---

**Next**: Test file operations, decide on sessions, clean up broken tools.
