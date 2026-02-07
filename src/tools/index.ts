// Tool Registry Index - Registers all tools
import { toolRegistry, registerTool } from './registry.js';
import { askOpenCodeTool } from './ask-opencode.tool.js';
import { pingTool, helpTool } from './simple-tools.js';
import { brainstormTool } from './brainstorm.tool.js';
import { timeoutTestTool } from './timeout-test.tool.js';
import { opencodePlanTool, opencodeBuildTool } from './slash-commands.tool.js';
import {
  opencodeHealthTool,
  opencodeCreateSessionTool,
  opencodeListSessionsTool,
  opencodeGetSessionTool,
  opencodeDeleteSessionTool,
  opencodeSendMessageTool,
  opencodeGetMessagesTool,
  opencodeFindFilesTool,
  opencodeSearchContentTool,
  opencodeGetFileContentTool,
  opencodeGetConfigTool,
  opencodeListProvidersTool,
} from './opencode-server.tool.js';

// Disabled: CLI tools spawn separate processes and bypass web server architecture
// registerTool(askOpenCodeTool);
registerTool(pingTool);
registerTool(helpTool);
registerTool(brainstormTool);
registerTool(timeoutTestTool);
// Disabled: CLI tools spawn separate processes and bypass web server architecture
// registerTool(opencodePlanTool);
// registerTool(opencodeBuildTool);
registerTool(opencodeHealthTool);
registerTool(opencodeCreateSessionTool);
registerTool(opencodeListSessionsTool);
registerTool(opencodeGetSessionTool);
registerTool(opencodeDeleteSessionTool);
registerTool(opencodeSendMessageTool);
registerTool(opencodeGetMessagesTool);
registerTool(opencodeFindFilesTool);
registerTool(opencodeSearchContentTool);
registerTool(opencodeGetFileContentTool);
registerTool(opencodeGetConfigTool);
registerTool(opencodeListProvidersTool);

export * from './registry.js';