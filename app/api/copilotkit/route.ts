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
  getPreviousState
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

const tools = [getWeather];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

// Define tasks
const callModel = task("callModel", async (messages: BaseMessageLike[]) => {
  const response = await model.bindTools(tools).invoke(messages);
  return response;
});

const callTool = task(
  "callTool",
  async (toolCall: ToolCall): Promise<ToolMessage> => {
    const tool = toolsByName[toolCall.name];
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
}, async (messages: BaseMessageLike[]) => {
  const previous = getPreviousState<BaseMessage[]>() ?? [];
  let currentMessages = addMessages(previous, messages);
  let llmResponse = await callModel(currentMessages);
  
  while (true) {
    if (!llmResponse.tool_calls?.length) {
      break;
    }

    // Execute tools
    const toolResults = await Promise.all(
      llmResponse.tool_calls.map((toolCall: ToolCall) => {
        return callTool(toolCall);
      })
    );

    // Append to message list
    currentMessages = addMessages(currentMessages, [llmResponse, ...toolResults]);

    // Call model again
    llmResponse = await callModel(currentMessages);
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
  chainFn: async ({ messages }, req?: NextRequest) => {
    // Get thread ID from cookie or generate new one
    let threadId = req?.cookies.get("copilot_thread_id")?.value;
    
    if (!threadId) {
      threadId = uuidv4();
      // Create response to set cookie
      const response = NextResponse.next();
      response.cookies.set("copilot_thread_id", threadId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
    }

    const config = { configurable: { thread_id: threadId } };
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
