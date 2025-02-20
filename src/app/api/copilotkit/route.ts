import { NextRequest, NextResponse } from "next/server";
import {
  CopilotRuntime,
  LangChainAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  type BaseMessageLike,
  AIMessage,
  ToolMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { 
  task,
  entrypoint,
  addMessages,
  MemorySaver,
  getPreviousState,
  LangGraphRunnableConfig
} from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";

// Initialize the LLM
const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});

// Define example weather tool
const getWeather = tool(async ({ location }: { location: string }) => {
  const lowercaseLocation = location.toLowerCase();
  if (lowercaseLocation.includes("sf") || lowercaseLocation.includes("san francisco")) {
    return "It's sunny!";
  } else if (lowercaseLocation.includes("boston")) {
    return "It's rainy!";
  } else {
    return `I am not sure what the weather in ${location}`;
  }
}, {
  name: "getWeather",
  schema: z.object({
    location: z.string().describe("location to get the weather for"),
  }),
  description: "Call to get the weather from a specific location."
});

// Define base tools (these will be combined with Copilot actions)
const baseTools = [getWeather];

// Define tool types
type ToolType = typeof getWeather;
interface ToolsByName {
  [key: string]: ToolType;
}

type ConfigurableType = {
  thread_id?: string;
  toolsByName?: ToolsByName;
};

// Define tasks
// const callModel = task("callModel", async (messages: BaseMessageLike[], config: LangGraphRunnableConfig<ConfigurableType>) => {
//   const toolsByName = config.configurable?.toolsByName ?? Object.fromEntries(baseTools.map(tool => [tool.name, tool]));
//   const tools = Object.values(toolsByName);
//   const response = await model.bindTools(tools).invoke(messages);
//   return response;
// });

const callTool = task(
  "callTool",
  async (toolCall: ToolCall, config: LangGraphRunnableConfig<ConfigurableType>): Promise<ToolMessage> => {
    const toolsByName = config.configurable?.toolsByName ?? Object.fromEntries(baseTools.map(tool => [tool.name, tool]));
    const tool = toolsByName[toolCall.name];
    if (!tool) {
      throw new Error(`Tool ${toolCall.name} not found`);
    }
    const observation = await tool.invoke(toolCall.args as { location: string });
    return new ToolMessage({ 
      content: observation, 
      tool_call_id: toolCall.id ?? "default_id"
    });
  }
);

// Create checkpointer for persistence
const checkpointer = new MemorySaver();

// Define the agent with memory using LangGraph Functional API
const agent = entrypoint({
  name: "agent",
  checkpointer,
}, async (messages: BaseMessageLike[], config: LangGraphRunnableConfig<ConfigurableType>) => {
  const previous = getPreviousState<BaseMessage[]>() ?? [];
  let currentMessages = addMessages(previous, messages);
  
  // Get tools from toolsByName or use base tools
  const toolsByName = config.configurable?.toolsByName ?? Object.fromEntries(baseTools.map(tool => [tool.name, tool]));
  const availableTools = Object.values(toolsByName);
  
  // Bind the tools to the model
  const boundModel = model.bindTools(availableTools);
  let llmResponse = await boundModel.invoke(currentMessages);
  
  while (true) {
    if (!llmResponse.tool_calls?.length) {
      break;
    }

    const toolResults = await Promise.all(
      llmResponse.tool_calls.map((toolCall: ToolCall) => {
        const tool = toolsByName[toolCall.name];
        if (!tool) {
          throw new Error(`Tool ${toolCall.name} not found`);
        }
        return callTool(toolCall, { configurable: { toolsByName } });
      })
    );

    // Append to message list
    currentMessages = addMessages(currentMessages, [llmResponse, ...toolResults]);

    // Call model again with bound tools
    llmResponse = await boundModel.invoke(currentMessages);
  }

  // Append final response for storage
  currentMessages = addMessages(currentMessages, llmResponse);

  return entrypoint.final({
    value: llmResponse,
    save: currentMessages,
  });
});

// Create the LangChain adapter with the agent
const serviceAdapter = new LangChainAdapter({
  chainFn: async ({ messages, tools: copilotTools, threadId: threadId }, req?: NextRequest) => {
    // Combine base tools with Copilot action tools and create tools map
    const allTools = [...baseTools, ...(copilotTools || [])] as ToolType[];
    const toolsByName = Object.fromEntries(allTools.map((tool) => [tool.name, tool])) as ToolsByName;

    const config: LangGraphRunnableConfig<ConfigurableType> = { 
      configurable: { 
        thread_id: threadId,
        toolsByName,
      }
    };

    const result = await agent.invoke(messages, config);
    return new AIMessage({ content: result.content });
  },
});

const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
