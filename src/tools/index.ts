// Tool Registry Index - Registers all tools
import { toolRegistry } from './registry.js';
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

toolRegistry.push(
  askOpenCodeTool,
  pingTool,
  helpTool,
  brainstormTool,
  timeoutTestTool,
  opencodePlanTool,
  opencodeBuildTool,
  // OpenCode Server API wrapper tools
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
  opencodeListProvidersTool
);

export * from './registry.js';