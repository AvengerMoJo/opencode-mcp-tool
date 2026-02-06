# OpenCode MCP Tool - Test Plan

**Version**: v1.1.4
**Date**: 2026-02-04
**Purpose**: Verify functionality before beta release

---

## Test Environment Setup

```bash
# Prerequisites:
# 1. OpenCode Manager started at least one project
# 2. Global MCP tool running on port 3005
# 3. Bearer token in environment

export BEARER_TOKEN=$(grep GLOBAL_MCP_BEARER_TOKEN ~/.env | cut -d= -f2)
export MCP_URL="http://127.0.0.1:3005"
```

---

## Phase 1: Smoke Tests (15 minutes)

### Test 1.1: Health Check

```bash
curl -s -H "Authorization: Bearer $BEARER_TOKEN" \
  "$MCP_URL/health"

# Expected: HTTP 200, health status JSON
# Result: [ ] PASS [ ] FAIL
```

### Test 1.2: List Available Tools

```bash
# Using MCP protocol to list tools
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/list" \
  -d '{}'

# Expected: List of 19 tools including opencode-* tools
# Result: [ ] PASS [ ] FAIL
# Notes: _______________________________
```

### Test 1.3: OpenCode Server Health

```bash
# Call opencode-server-health tool
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d '{
    "name": "opencode-server-health",
    "arguments": {}
  }'

# Expected: OpenCode server status (should be healthy)
# Result: [ ] PASS [ ] FAIL
# Notes: _______________________________
```

### Test 1.4: List Sessions

```bash
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d '{
    "name": "opencode-session-list",
    "arguments": {}
  }'

# Expected: Array of sessions (may be empty)
# Result: [ ] PASS [ ] FAIL
# Session count: _______
```

### Test 1.5: Create Session

```bash
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d '{
    "name": "opencode-session-create",
    "arguments": {}
  }' | tee /tmp/session.json

# Expected: New session object with ID
# Result: [ ] PASS [ ] FAIL
# Session ID: _______________________________
```

---

## Phase 2: Basic Workflow Tests (20 minutes)

### Test 2.1: Send Message to Session

```bash
SESSION_ID=$(cat /tmp/session.json | jq -r '.id')

curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d "{
    \"name\": \"opencode-send-message\",
    \"arguments\": {
      \"sessionId\": \"$SESSION_ID\",
      \"message\": \"Create a file called test.txt with content 'Hello World'\"
    }
  }"

# Expected: Message sent, OpenCode responds
# Result: [ ] PASS [ ] FAIL
# Notes: _______________________________
```

### Test 2.2: Get Messages from Session

```bash
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d "{
    \"name\": \"opencode-get-messages\",
    \"arguments\": {
      \"sessionId\": \"$SESSION_ID\"
    }
  }"

# Expected: Array of messages including our request and OpenCode's response
# Result: [ ] PASS [ ] FAIL
# Message count: _______
```

### Test 2.3: Find Files

```bash
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d '{
    "name": "opencode-find-files",
    "arguments": {
      "pattern": "*.txt"
    }
  }'

# Expected: List of .txt files (should include test.txt if created)
# Result: [ ] PASS [ ] FAIL
# Files found: _______________________________
```

### Test 2.4: Read File Content

```bash
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d '{
    "name": "opencode-get-file-content",
    "arguments": {
      "path": "test.txt"
    }
  }'

# Expected: File content "Hello World"
# Result: [ ] PASS [ ] FAIL
# Content: _______________________________
```

### Test 2.5: Search Content

```bash
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d '{
    "name": "opencode-search-content",
    "arguments": {
      "query": "Hello"
    }
  }'

# Expected: Search results including test.txt
# Result: [ ] PASS [ ] FAIL
# Matches: _______
```

---

## Phase 3: Session Persistence Tests (30 minutes)

### Test 3.1: Record Session State

```bash
# Save session ID and message count before restart
SESSION_ID=$(cat /tmp/session.json | jq -r '.id')
echo "Session ID: $SESSION_ID" > /tmp/before_restart.txt

curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d "{
    \"name\": \"opencode-get-messages\",
    \"arguments\": {
      \"sessionId\": \"$SESSION_ID\"
    }
  }" | jq '.messages | length' >> /tmp/before_restart.txt

cat /tmp/before_restart.txt

# Result: Session ID and message count recorded
```

### Test 3.2: Restart OpenCode Server

```bash
# Use OpenCode Manager to restart the project
python3 << 'EOF'
import sys
import asyncio
sys.path.insert(0, '/home/alex/Development/Personal/MoJoAssistant')
from app.mcp.opencode.manager import OpenCodeManager

async def restart():
    manager = OpenCodeManager()
    result = await manager.restart_project("personal-update-version-of-chatmcp-client")
    print(f"Restart result: {result['status']}")

asyncio.run(restart())
EOF

# Wait for restart to complete
sleep 10

# Result: [ ] PASS [ ] FAIL
```

### Test 3.3: Verify Session Persistence

```bash
SESSION_ID=$(head -1 /tmp/before_restart.txt | cut -d' ' -f3)
MESSAGE_COUNT_BEFORE=$(tail -1 /tmp/before_restart.txt)

echo "Checking if session $SESSION_ID still exists..."

# List sessions after restart
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d '{
    "name": "opencode-session-list",
    "arguments": {}
  }' | tee /tmp/sessions_after.json

# Check if our session is in the list
grep -q "$SESSION_ID" /tmp/sessions_after.json && echo "✅ Session found" || echo "❌ Session lost"

# Result: [ ] PASS (session persisted) [ ] FAIL (session lost)
# Notes: _______________________________
```

### Test 3.4: Verify Message History Preservation

```bash
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d "{
    \"name\": \"opencode-get-messages\",
    \"arguments\": {
      \"sessionId\": \"$SESSION_ID\"
    }
  }" | jq '.messages | length' > /tmp/after_restart.txt

MESSAGE_COUNT_AFTER=$(cat /tmp/after_restart.txt)

echo "Messages before restart: $MESSAGE_COUNT_BEFORE"
echo "Messages after restart: $MESSAGE_COUNT_AFTER"

if [ "$MESSAGE_COUNT_BEFORE" -eq "$MESSAGE_COUNT_AFTER" ]; then
  echo "✅ Message history preserved"
else
  echo "❌ Message history lost or changed"
fi

# Result: [ ] PASS [ ] FAIL
# Notes: _______________________________
```

---

## Phase 4: Multi-Server Tests (20 minutes)

### Test 4.1: List Available Servers

```bash
cat ~/.memory/opencode-mcp-tool-servers.json | jq .

# Expected: At least 2 servers configured
# Result: [ ] PASS [ ] FAIL
# Server count: _______
# Server IDs: _______________________________
```

### Test 4.2: Create Session on Server A

```bash
SERVER_A=$(cat ~/.memory/opencode-mcp-tool-servers.json | jq -r '.servers[0].id')

curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d "{
    \"name\": \"opencode-session-create\",
    \"arguments\": {
      \"server\": \"$SERVER_A\"
    }
  }" | tee /tmp/session_a.json

# Expected: Session created on server A
# Result: [ ] PASS [ ] FAIL
# Session ID: _______________________________
```

### Test 4.3: Create Session on Server B

```bash
SERVER_B=$(cat ~/.memory/opencode-mcp-tool-servers.json | jq -r '.servers[1].id')

curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d "{
    \"name\": \"opencode-session-create\",
    \"arguments\": {
      \"server\": \"$SERVER_B\"
    }
  }" | tee /tmp/session_b.json

# Expected: Session created on server B
# Result: [ ] PASS [ ] FAIL
# Session ID: _______________________________
```

### Test 4.4: Verify Server Isolation

```bash
SESSION_A_ID=$(cat /tmp/session_a.json | jq -r '.id')
SESSION_B_ID=$(cat /tmp/session_b.json | jq -r '.id')

# Send message to session A
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d "{
    \"name\": \"opencode-send-message\",
    \"arguments\": {
      \"sessionId\": \"$SESSION_A_ID\",
      \"server\": \"$SERVER_A\",
      \"message\": \"This is server A\"
    }
  }"

# Send different message to session B
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d "{
    \"name\": \"opencode-send-message\",
    \"arguments\": {
      \"sessionId\": \"$SESSION_B_ID\",
      \"server\": \"$SERVER_B\",
      \"message\": \"This is server B\"
    }
  }"

# Verify messages are isolated
echo "Session A messages:"
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d "{
    \"name\": \"opencode-get-messages\",
    \"arguments\": {
      \"sessionId\": \"$SESSION_A_ID\",
      \"server\": \"$SERVER_A\"
    }
  }" | jq '.messages[-1].content' | grep -q "server A" && echo "✅ Correct" || echo "❌ Wrong"

echo "Session B messages:"
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d "{
    \"name\": \"opencode-get-messages\",
    \"arguments\": {
      \"sessionId\": \"$SESSION_B_ID\",
      \"server\": \"$SERVER_B\"
    }
  }" | jq '.messages[-1].content' | grep -q "server B" && echo "✅ Correct" || echo "❌ Wrong"

# Result: [ ] PASS (isolated) [ ] FAIL (cross-contamination)
# Notes: _______________________________
```

---

## Phase 5: Error Handling Tests (15 minutes)

### Test 5.1: Invalid Session ID

```bash
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d '{
    "name": "opencode-get-messages",
    "arguments": {
      "sessionId": "invalid-session-id-12345"
    }
  }'

# Expected: Clear error message (not 500 crash)
# Result: [ ] PASS [ ] FAIL
# Error message: _______________________________
```

### Test 5.2: Invalid Tool Name

```bash
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d '{
    "name": "nonexistent-tool",
    "arguments": {}
  }'

# Expected: Tool not found error
# Result: [ ] PASS [ ] FAIL
# Error message: _______________________________
```

### Test 5.3: Missing Required Arguments

```bash
curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  "$MCP_URL/mcp/v1/tools/call" \
  -d '{
    "name": "opencode-send-message",
    "arguments": {}
  }'

# Expected: Validation error for missing sessionId and message
# Result: [ ] PASS [ ] FAIL
# Error message: _______________________________
```

---

## Test Results Summary

### Phase 1: Smoke Tests
- [ ] All tests passed
- [ ] Some tests failed (specify): _______________________________
- [ ] Critical failures (abort): _______________________________

### Phase 2: Basic Workflow
- [ ] All tests passed
- [ ] Some tests failed (specify): _______________________________
- [ ] Critical failures (abort): _______________________________

### Phase 3: Session Persistence
- [ ] Sessions persist across restarts ✅
- [ ] Sessions lost on restart ❌ **BLOCKER**
- [ ] Message history preserved ✅
- [ ] Message history lost ❌ **BLOCKER**

### Phase 4: Multi-Server Mode
- [ ] All tests passed
- [ ] Some tests failed (specify): _______________________________
- [ ] Critical failures (abort): _______________________________

### Phase 5: Error Handling
- [ ] All tests passed
- [ ] Some tests failed (specify): _______________________________
- [ ] Critical failures (abort): _______________________________

---

## Go/No-Go Decision

**Proceed with v1.1 Beta Release**: [ ] YES [ ] NO

**Justification**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Known Issues to Document**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Blockers (must fix before release)**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Next Steps

If GO:
- [ ] Document all known issues
- [ ] Update README with limitations
- [ ] Commit code with test results
- [ ] Tag beta release
- [ ] Notify beta testers

If NO-GO:
- [ ] Create GitHub issues for failures
- [ ] Prioritize critical fixes
- [ ] Re-run tests after fixes
- [ ] Schedule next test run

---

## Notes

_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
