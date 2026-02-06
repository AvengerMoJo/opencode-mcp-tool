# OpenCode MCP Tool - Functionality Analysis

**Date**: 2026-02-04
**Version**: opencode-mcp-tool v1.1.4
**Purpose**: Assess if the tool is robust enough for thinking models to work on real projects

---

## 📊 Available Tools (19 total)

### Category: OpenCode Server Integration (12 tools)

| Tool | Purpose | Critical? |
|------|---------|-----------|
| `opencode-server-health` | Check server status | ✅ Essential |
| `opencode-session-create` | Create new coding session | ✅ Essential |
| `opencode-session-list` | List all sessions | ✅ Essential |
| `opencode-session-get` | Get session details | ✅ Essential |
| `opencode-session-delete` | Delete session | ⚠️ Nice-to-have |
| `opencode-send-message` | Send message to session | ✅ **CRITICAL** |
| `opencode-get-messages` | Get conversation history | ✅ Essential |
| `opencode-find-files` | Search for files | ✅ Essential |
| `opencode-search-content` | Search file contents | ✅ Essential |
| `opencode-get-file-content` | Read file | ✅ **CRITICAL** |
| `opencode-get-config` | Get server config | ⚠️ Nice-to-have |
| `opencode-list-providers` | List AI providers | ⚠️ Nice-to-have |

### Category: Slash Commands (2 tools)

| Tool | Purpose | Critical? |
|------|---------|-----------|
| `opencode-plan` | Generate implementation plan | ✅ Essential |
| `opencode-build` | Execute build/test | ⚠️ Nice-to-have |

### Category: Helper Tools (5 tools)

| Tool | Purpose | Critical? |
|------|---------|-----------|
| `ask-opencode` | Interactive Q&A | ⚠️ Convenience |
| `brainstorm` | Idea generation | ⚠️ Convenience |
| `ping` | Health check | ⚠️ Debug |
| `help` | Tool documentation | ⚠️ Debug |
| `timeout-test` | Test timeouts | ⚠️ Debug |

---

## 🔍 Core Coding Workflow Analysis

### What a Thinking Model Needs to Code Effectively:

1. **Read codebase** ✅
   - `opencode-find-files` - Find relevant files
   - `opencode-search-content` - Search for keywords/patterns
   - `opencode-get-file-content` - Read file contents

2. **Understand context** ✅
   - `opencode-session-create` - Start new task
   - `opencode-get-messages` - Review conversation
   - `opencode-plan` - Generate structured plan

3. **Make changes** ✅
   - `opencode-send-message` - Send coding instructions to OpenCode
   - OpenCode executes: file edits, terminal commands, etc.

4. **Verify changes** ⚠️ **POTENTIAL GAP**
   - `opencode-get-messages` - See what OpenCode did
   - `opencode-get-file-content` - Re-read modified files
   - **MISSING**: Direct file diff/comparison?

5. **Run tests** ⚠️ **POTENTIAL GAP**
   - `opencode-build` - Build/test command
   - `opencode-send-message` - Ask OpenCode to run tests
   - **MISSING**: Direct test execution? Parse test results?

6. **Iterate** ✅
   - `opencode-send-message` - Continue conversation
   - Session-based workflow natural for iteration

---

## ⚠️ Identified Gaps & Concerns

### Gap #1: **No Direct File Write**
**Issue**: Thinking model can only request changes through `opencode-send-message`, can't directly write files

**Impact**:
- Depends on OpenCode's AI understanding the request correctly
- Extra token cost (model → OpenCode AI → actual edit)
- Potential for misinterpretation

**Workaround**:
- Use very specific instructions in messages
- Verify changes by re-reading files

**Recommendation**:
- ⚠️ **MEDIUM** - May slow down iteration, but workflow still functional

---

### Gap #2: **No Direct Terminal Command Execution**
**Issue**: Can't run shell commands directly, must ask OpenCode via message

**Impact**:
- Can't directly run `npm install`, `git status`, etc.
- Depends on OpenCode's terminal tool understanding

**Workaround**:
- Send clear terminal commands in messages
- Review OpenCode's terminal output in messages

**Recommendation**:
- ⚠️ **MEDIUM** - Functional but inefficient

---

### Gap #3: **No File Diff/Comparison**
**Issue**: After OpenCode makes changes, can't easily see what changed

**Impact**:
- Must re-read entire file to verify
- No quick "show me what you changed"

**Workaround**:
- Re-read modified files
- Compare manually or ask OpenCode "what did you change?"

**Recommendation**:
- ⚠️ **LOW** - Inconvenient but not blocking

---

### Gap #4: **No Test Result Parsing**
**Issue**: Test output is buried in message history, not structured

**Impact**:
- Hard to programmatically verify tests passed
- Model must parse unstructured text

**Workaround**:
- Ask OpenCode to summarize test results
- Parse message content manually

**Recommendation**:
- ⚠️ **LOW** - Depends on use case

---

### Gap #5: **No Multi-File Operations**
**Issue**: Can't batch read/write multiple files efficiently

**Impact**:
- Must make multiple API calls to read related files
- Slower for large refactorings

**Workaround**:
- Sequential file operations
- Use `find-files` + loop over results

**Recommendation**:
- ⚠️ **LOW** - Performance issue, not functionality

---

### Gap #6: **Session State Persistence** ⚠️ **CRITICAL TO VERIFY**
**Issue**: Unknown if sessions persist across OpenCode restarts

**Impact**:
- If sessions lost on restart, conversation history gone
- Model loses context mid-task

**Workaround**:
- Unclear - need to test

**Recommendation**:
- ❌ **HIGH** - **MUST TEST THIS**

---

## 🧪 Critical Tests Needed

### Test 1: Basic Workflow ✅ SHOULD WORK
```
1. Create session
2. Send message: "Create a file called test.txt with content 'Hello'"
3. Read test.txt to verify
4. Send message: "Add 'World' to test.txt"
5. Read test.txt to verify update
```

**Expected**: File created and modified correctly
**Risk**: LOW

---

### Test 2: Session Persistence ❌ UNKNOWN
```
1. Create session with some messages
2. Restart OpenCode server
3. List sessions - is the session still there?
4. Get messages - is history preserved?
```

**Expected**: Sessions should persist (or clear documentation if not)
**Risk**: **HIGH** - Could lose work mid-task

---

### Test 3: Complex Refactoring ⚠️ MEDIUM RISK
```
1. Create session
2. Send message: "Refactor function X to use async/await"
3. Get messages to see OpenCode's plan
4. Read modified files
5. Send message: "Run tests"
6. Verify tests passed from messages
```

**Expected**: OpenCode understands and executes complex requests
**Risk**: MEDIUM - Depends on OpenCode AI quality

---

### Test 4: Error Handling ⚠️ MEDIUM RISK
```
1. Send message with syntax error
2. Verify OpenCode catches it
3. Send message to fix
4. Verify fix applied
```

**Expected**: Clear error messages, ability to recover
**Risk**: MEDIUM - Unclear how errors surface

---

### Test 5: Multi-Server Mode ⚠️ MEDIUM RISK
```
1. Start 2 OpenCode projects
2. Create session on server A
3. Create session on server B
4. Verify server parameter routes correctly
5. Verify no cross-contamination
```

**Expected**: Servers isolated correctly
**Risk**: MEDIUM - New N:1 architecture feature

---

## 📋 Recommended Additional Tools

### Priority: HIGH
1. **`opencode-get-file-diff`** - Show changes made in session
2. **`opencode-session-export`** - Export conversation for debugging
3. **`opencode-terminal-execute`** - Direct command execution (bypass AI)

### Priority: MEDIUM
4. **`opencode-batch-read-files`** - Read multiple files in one call
5. **`opencode-test-run`** - Structured test execution + parsing
6. **`opencode-git-status`** - Git integration helpers

### Priority: LOW
7. **`opencode-session-fork`** - Branch conversation for experiments
8. **`opencode-rollback`** - Undo last N operations

---

## 🎯 Assessment for Thinking Models

### ✅ Strengths

1. **Session-based workflow** - Natural for iterative coding
2. **OpenCode AI handles complexity** - Don't need to implement file editing
3. **Multi-server support** - Can work on multiple projects
4. **Search capabilities** - Find files and content easily

### ⚠️ Weaknesses

1. **Indirect control** - Must ask OpenCode AI, can't directly edit
2. **Verification friction** - Must re-read files to confirm changes
3. **Unknown session persistence** - Critical gap in documentation/testing
4. **No structured test results** - Hard to programmatically verify success

### ❌ Blockers (Must Verify)

1. **Session persistence across restarts** - MUST TEST
2. **Error handling clarity** - MUST TEST
3. **Multi-server isolation** - MUST TEST

---

## 🚦 Release Readiness

### For v1.1 Beta Testing: ⚠️ **CONDITIONAL**

**Can proceed IF**:
- ✅ Sessions persist across restarts (or documented limitation)
- ✅ Basic workflow tests pass (create, edit, read)
- ✅ Multi-server mode works correctly

**Should NOT proceed IF**:
- ❌ Sessions lost on restart (data loss risk)
- ❌ Basic file operations don't work
- ❌ Server routing broken in multi-server mode

---

## 📝 Test Plan (Before Release)

### Phase 1: Smoke Tests (15 minutes)
- [ ] Health check works
- [ ] Create session works
- [ ] Send message works
- [ ] Read file works
- [ ] List sessions works

### Phase 2: Persistence Tests (30 minutes)
- [ ] Create session with messages
- [ ] Restart OpenCode server
- [ ] Verify session still exists
- [ ] Verify messages preserved

### Phase 3: Multi-Server Tests (20 minutes)
- [ ] Create sessions on both servers
- [ ] Verify isolation
- [ ] Verify server parameter routing

### Phase 4: Error Handling (15 minutes)
- [ ] Send invalid request
- [ ] Verify error message
- [ ] Verify recovery possible

---

## 🎬 Next Steps

1. **Run smoke tests** - Verify basic functionality works
2. **Test session persistence** - Critical for data integrity
3. **Test multi-server mode** - New architecture feature
4. **Document limitations** - What works, what doesn't
5. **Identify must-have vs nice-to-have additions**
6. **Create bug report template** for user testing

---

## 💡 Recommendations

### Before v1.1 Beta Release:
1. ✅ Complete test plan above
2. ✅ Document session persistence behavior
3. ✅ Verify multi-server isolation
4. ⚠️ Consider adding `opencode-get-file-diff` tool
5. ⚠️ Add session export for debugging

### For v1.2 (Post-Beta):
1. Add direct file write capability (bypass OpenCode AI)
2. Add direct terminal execution
3. Add batch file operations
4. Add structured test result parsing
5. Add git integration helpers

---

## 🏁 Conclusion

The opencode-mcp-tool has **adequate basic functionality** for coding workflows, but has **gaps that may frustrate thinking models**:

- ✅ Can read codebase
- ✅ Can request changes via OpenCode AI
- ✅ Can verify changes (with effort)
- ⚠️ Indirect control adds latency
- ⚠️ Verification requires extra steps
- ❌ **Session persistence MUST be verified**

**Recommendation**: **Run full test plan before release**. If tests pass, proceed with v1.1 beta with documented limitations. If critical tests fail, hold release and add missing functionality.
