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

let isProcessing = false; let currentOperationName = ""; let latestOutput = "";

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
  ) {
    isProcessing = true;
    currentOperationName = operationName;
    latestOutput = "";

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

    const progressInterval = setInterval(async () => {
      if (isProcessing && progressToken) {
        progress += 1;

        const baseMessage = progressMessages[messageIndex % progressMessages.length];
        const outputPreview = latestOutput.slice(-150).trim();
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
      } else if (!isProcessing) {
        clearInterval(progressInterval);
      }
    }, PROTOCOL.KEEPALIVE_INTERVAL);

    return { interval: progressInterval, progressToken };
  }

  function stopProgressUpdates(
    progressData: { interval: NodeJS.Timeout; progressToken?: string | number },
    success: boolean = true
  ) {
    const operationName = currentOperationName;
    isProcessing = false;
    currentOperationName = "";
    clearInterval(progressData.interval);

    if (progressData.progressToken) {
      sendProgressNotification(
        progressData.progressToken,
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
    return { tools: getToolDefinitions() as unknown as Tool[] };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
    const toolName: string = request.params.name;

    if (toolExists(toolName)) {
      const progressToken = (request.params as any)._meta?.progressToken;

      const progressData = startProgressUpdates(toolName, progressToken);

      try {
        const args: ToolArguments = (request.params.arguments as ToolArguments) || {};

        Logger.toolInvocation(toolName, request.params.arguments);

        const result = await executeTool(toolName, args, (newOutput) => {
          latestOutput = newOutput;
        });

        stopProgressUpdates(progressData, true);

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
        stopProgressUpdates(progressData, false);

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
    return { prompts: getPromptDefinitions() as unknown as Prompt[] };
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
