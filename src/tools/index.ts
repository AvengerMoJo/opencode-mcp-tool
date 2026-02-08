// Tool Registry Index - Registers all tools
import { registerTool } from './registry.js';
import { pingTool, helpTool } from './simple-tools.js';
import { brainstormTool } from './brainstorm.tool.js';
import { timeoutTestTool } from './timeout-test.tool.js';
import {
  opencodeHealthTool,
  opencodeCreateSessionTool,
  opencodeListSessionsTool,
  opencodeGetSessionTool,
  opencodeDeleteSessionTool,
  opencodeSendMessageTool,
  opencodeGetMessagesTool,
} from './opencode-server.tool.js';

registerTool(pingTool);
registerTool(helpTool);
registerTool(brainstormTool);
registerTool(timeoutTestTool);
registerTool(opencodeHealthTool);
registerTool(opencodeCreateSessionTool);
registerTool(opencodeListSessionsTool);
registerTool(opencodeGetSessionTool);
registerTool(opencodeDeleteSessionTool);
registerTool(opencodeSendMessageTool);
registerTool(opencodeGetMessagesTool);

export * from './registry.js';