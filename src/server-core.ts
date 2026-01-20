import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  CallToolRequest,
  ListToolsRequest,
  ListPromptsRequest,
  GetPromptRequest,
  Tool,
  Prompt,
  GetPromptResult,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "./utils/logger.js";
import { PROTOCOL, ToolArguments } from "./constants.js";

import {
  getToolDefinitions,
  getPromptDefinitions,
  executeTool,
  toolExists,
  getPromptMessage
} from "./tools/index.js";

export function createMCPServer(): Server {
  return new Server(
    {
      name: "opencode-mcp",
      version: "1.1.4",
    }, {
    capabilities: {
      tools: {},
      prompts: {},
      logging: {},
    },
  },
  );
}

interface ProgressState {
  isProcessing: boolean;
  currentOperationName: string;
  latestOutput: string;
  interval: NodeJS.Timeout | null;
  progressToken: string | number | undefined;
}

export function setupProgressNotifications(server: Server) {
  async function sendNotification(method: string, params: any) {
    try {
      await server.notification({ method, params });
    } catch (error) {
      Logger.error("notification failed: ", error);
    }
  }

  async function sendProgressNotification(
    progressToken: string | number | undefined,
    progress: number,
    total?: number,
    message?: string
  ) {
    if (!progressToken) return;

    try {
      const params: any = {
        progressToken,
        progress
      };

      if (total !== undefined) params.total = total;
      if (message) params.message = message;

      await server.notification({
        method: PROTOCOL.NOTIFICATIONS.PROGRESS,
        params
      });
    } catch (error) {
      Logger.error("Failed to send progress notification:", error);
    }
  }

  function startProgressUpdates(
    operationName: string,
    progressToken?: string | number
  ): ProgressState {
    const state: ProgressState = {
      isProcessing: true,
      currentOperationName: operationName,
      latestOutput: "",
      interval: null,
      progressToken
    };

    const progressMessages = [
      `${operationName} - OpenCode is analyzing your request...`,
      `${operationName} - Processing files and generating insights...`,
      `${operationName} - Creating a structured response for your review...`,
      `${operationName} - Large analysis in progress (this is normal for big requests)...`,
      `${operationName} - Still working... OpenCode takes time for quality results...`,
    ];

    let messageIndex = 0;
    let progress = 0;

    if (progressToken) {
      sendProgressNotification(
        progressToken,
        0,
        undefined,
        `Starting ${operationName}`
      );
    }

    state.interval = setInterval(async () => {
      if (state.isProcessing && progressToken) {
        progress += 1;

        const baseMessage = progressMessages[messageIndex % progressMessages.length];
        const outputPreview = state.latestOutput.slice(-150).trim();
        const message = outputPreview
          ? `${baseMessage}\nOutput preview: ...${outputPreview}`
          : baseMessage;

        await sendProgressNotification(
          progressToken,
          progress,
          undefined,
          message
        );
        messageIndex++;
      } else if (!state.isProcessing && state.interval) {
        clearInterval(state.interval);
      }
    }, PROTOCOL.KEEPALIVE_INTERVAL);

    return state;
  }

  function stopProgressUpdates(
    state: ProgressState,
    success: boolean = true
  ) {
    const operationName = state.currentOperationName;
    state.isProcessing = false;
    state.currentOperationName = "";
    if (state.interval) {
      clearInterval(state.interval);
    }

    if (state.progressToken) {
      sendProgressNotification(
        state.progressToken,
        100,
        100,
        success ? `${operationName} completed successfully.` : `${operationName} failed.`
      );
    }
  }

  return { startProgressUpdates, stopProgressUpdates };
}

export function setupRequestHandlers(
  server: Server,
  progressFunctions: ReturnType<typeof setupProgressNotifications>
) {
  const { startProgressUpdates, stopProgressUpdates } = progressFunctions;

  server.setRequestHandler(ListToolsRequestSchema, async (request: ListToolsRequest): Promise<{ tools: Tool[] }> => {
    return { tools: getToolDefinitions() };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
    const toolName: string = request.params.name;

    if (toolExists(toolName)) {
      const progressToken = (request.params as any)._meta?.progressToken;

      const progressState = startProgressUpdates(toolName, progressToken);

      try {
        const args: ToolArguments = (request.params.arguments as ToolArguments) || {};

        Logger.toolInvocation(toolName, request.params.arguments);

        const result = await executeTool(toolName, args, (newOutput) => {
          progressState.latestOutput = newOutput;
        });

        stopProgressUpdates(progressState, true);

        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
          isError: false,
        };
      } catch (error) {
        stopProgressUpdates(progressState, false);

        Logger.error(`Error in tool '${toolName}':`, error);

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `Error executing ${toolName}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    } else {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async (request: ListPromptsRequest): Promise<{ prompts: Prompt[] }> => {
    return { prompts: getPromptDefinitions() };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request: GetPromptRequest): Promise<GetPromptResult> => {
    const promptName = request.params.name;
    const args = request.params.arguments || {};

    const promptMessage = getPromptMessage(promptName, args);

    if (!promptMessage) {
      throw new Error(`Unknown prompt: ${promptName}`);
    }

    return {
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: promptMessage
        }
      }]
    };
  });
}
