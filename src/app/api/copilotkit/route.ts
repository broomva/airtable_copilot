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
  LangGraphRunnableConfig,
  interrupt
} from "@langchain/langgraph";

// Define the state type for our agent
interface AgentState {
  messages: BaseMessage[];
  tools: ToolType[];
  threadId: string;
}

// Initialize the LLM with retry logic
const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
  maxRetries: 3,
  apiKey: process.env.OPENAI_API_KEY,
});

// Tool creation helper
const createTool = (config: {
  name: string;
  description: string;
  schema: z.ZodType<any>;
  handler: (args: any) => Promise<any>;
}) => {
  return tool(
    async (args: any) => {
      try {
        return await config.handler(args);
      } catch (error) {
        console.error(`Tool ${config.name} failed:`, error);
        throw error;
      }
    },
    {
      name: config.name,
      description: config.description,
      schema: config.schema,
    }
  );
};

// Define example weather tool using the helper
const getWeather = createTool({
  name: "getWeather",
  description: "Call to get the weather from a specific location.",
  schema: z.object({
    location: z.string().describe("location to get the weather for"),
  }),
  handler: async ({ location }: { location: string }) => {
    const lowercaseLocation = location.toLowerCase();
    if (lowercaseLocation.includes("sf") || lowercaseLocation.includes("san francisco")) {
      return "It's sunny!";
    } else if (lowercaseLocation.includes("boston")) {
      return "It's rainy!";
    } else {
      return `I am not sure what the weather in ${location}`;
    }
  },
});

// Define base tools
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

// Task to call the LLM
const callLLM = task(
  {
    name: "callLLM",
    retry: { maxAttempts: 3 },
  },
  async (messages: BaseMessageLike[], tools: ToolType[]) => {
    try {
      const boundModel = model.bindTools(tools);
      return boundModel.invoke(messages);
    } catch (error) {
      console.error('LLM call failed:', error);
      throw error;
    }
  }
);

// Task to execute tools with idempotency
const executeTools = task(
  "executeTools",
  async (toolCalls: ToolCall[], toolsByName: ToolsByName): Promise<ToolMessage[]> => {
    const results = new Map<string, ToolMessage>();
    
    for (const toolCall of toolCalls) {
      const idempotencyKey = `${toolCall.name}:${JSON.stringify(toolCall.args)}`;
      
      if (!results.has(idempotencyKey)) {
        const tool = toolsByName[toolCall.name];
        if (!tool) throw new Error(`Tool ${toolCall.name} not found`);
        
        const result = new ToolMessage({
          content: await tool.invoke(toolCall.args),
          tool_call_id: toolCall.id ?? "default_id"
        });
        
        results.set(idempotencyKey, result);
      }
    }
    
    return Array.from(results.values());
  }
);

// Create checkpointer for persistence
const checkpointer = new MemorySaver();

// Define the agent with memory using LangGraph Functional API
const agent = entrypoint({
  name: "agent",
  checkpointer,
}, async (messages: BaseMessageLike[], config: LangGraphRunnableConfig<ConfigurableType>) => {
  // Get previous state or initialize new one
  const previous = getPreviousState<AgentState>() ?? {
    messages: [],
    tools: baseTools,
    threadId: config.configurable?.thread_id ?? ''
  };

  // Update current messages with history
  let currentMessages = addMessages(previous.messages, messages);
  
  // Get tools from config or use base tools
  const toolsByName = config.configurable?.toolsByName ?? 
    Object.fromEntries(baseTools.map(tool => [tool.name, tool]));
  const availableTools = Object.values(toolsByName);

  // Stream the current state
  config.writer?.({
    type: 'state_update',
    messages: currentMessages,
    tools: availableTools.map(t => t.name)
  });

  // Call LLM with current messages and tools
  let llmResponse = await callLLM(currentMessages, availableTools);
  
  while (true) {
    if (!llmResponse.tool_calls?.length) {
      break;
    }

    // Execute tools with idempotency
    const toolResults = await executeTools(llmResponse.tool_calls, toolsByName);

    // Stream tool execution results
    config.writer?.({
      type: 'tool_execution',
      results: toolResults.map(r => ({ 
        tool: r.tool_call_id,
        result: r.content 
      }))
    });

    // Append to message list
    currentMessages = addMessages(currentMessages, [llmResponse, ...toolResults]);

    // Check if we need human review
    if (needsHumanReview(llmResponse)) {
      const humanApproval = interrupt({
        messages: currentMessages,
        response: llmResponse,
        action: "Please review this response"
      });
      
      if (!humanApproval) {
        // If not approved, get a new response
        llmResponse = await callLLM(currentMessages, availableTools);
        continue;
      }
    }

    // Call model again with bound tools
    llmResponse = await callLLM(currentMessages, availableTools);
  }

  // Return final response and save state
  return entrypoint.final({
    value: llmResponse,
    save: {
      messages: currentMessages,
      tools: availableTools,
      threadId: config.configurable?.thread_id ?? ''
    }
  });
});

// Helper function to determine if human review is needed
function needsHumanReview(response: AIMessage): boolean {
  // Add your logic here to determine if human review is needed
  // For example, check for specific keywords or confidence scores
  return false; // Default to false for now
}

// Create the LangChain adapter with the agent
const serviceAdapter = new LangChainAdapter({
  chainFn: async ({ messages, tools: copilotTools, threadId }, req?: NextRequest) => {
    // Combine base tools with Copilot action tools and create tools map
    const allTools = [...baseTools, ...(copilotTools || [])] as ToolType[];
    const toolsByName = Object.fromEntries(allTools.map((tool) => [tool.name, tool])) as ToolsByName;

    const config: LangGraphRunnableConfig<ConfigurableType> = { 
      configurable: { 
        thread_id: threadId,
        toolsByName,
      }
    };

    try {
      const result = await agent.invoke(messages, config);
      return new AIMessage({ content: result.content });
    } catch (error) {
      console.error('Agent execution failed:', error);
      throw error;
    }
  },
});

const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  try {
    return await handleRequest(req);
  } catch (error) {
    console.error('Request handling failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
