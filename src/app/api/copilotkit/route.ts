import {
  CopilotRuntime,
  LangChainAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { ChatOpenAI } from "@langchain/openai";
import { NextRequest } from 'next/server';

const model = new ChatOpenAI({ model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY });
const serviceAdapter = new LangChainAdapter({
    chainFn: async ({ messages, tools, threadId }) => {

    return model.bindTools(tools).stream(messages, { configurable: { threadId } });
  }
});
const runtime = new CopilotRuntime();
 
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });
 
  return handleRequest(req);
};



// import {
//   CopilotRuntime,
//   LangChainAdapter,
//   copilotRuntimeNextJSAppRouterEndpoint,
// } from '@copilotkit/runtime';
// import { ChatOpenAI } from "@langchain/openai";
// import { NextRequest } from 'next/server';
// import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
// import { SystemMessage, ToolMessage, AIMessage } from "@langchain/core/messages";
// import { BaseMessage } from "@langchain/core/messages";
// import { RunnableConfig } from "@langchain/core/runnables";
// interface MessageWithToolCalls extends BaseMessage {
//   tool_calls?: Array<{
//     id: string;
//     name: string;
//     args: any;
//   }>;
// }

// const model = new ChatOpenAI({ model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY });

// // Create the LangGraph agent
// function createAgentGraph(tools: any[]) {
//   const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
//   const llmWithTools = model.bindTools(tools);

//   // LLM Node
//   async function llmCall(state: typeof MessagesAnnotation.State) {
//     const result = await llmWithTools.invoke([
//       new SystemMessage("You are a helpful assistant that uses tools when needed to accomplish tasks."),
//       ...state.messages
//     ]);
//     return { messages: [result] };
//   }

//   // Tool Execution Node
//   async function toolNode(state: typeof MessagesAnnotation.State, config: RunnableConfig) {
//     const results: ToolMessage[] = [];
//     const lastMessage = state.messages.at(-1) as MessageWithToolCalls;

//     if (lastMessage?.tool_calls?.length) {
//       for (const toolCall of lastMessage.tool_calls) {
//         const tool = toolsByName[toolCall.name];
//         console.log('toolCall args', toolCall.args);
//         const observation = await tool.invoke(toolCall.args, config);
//         console.log('observation', observation);
//         results.push(
//           new ToolMessage({
//             content: observation,
//             tool_call_id: toolCall.id,
//           })
//         );
//       }
//     }
//     return { messages: results };
//   }

//   // Edge routing function
//   function shouldContinue(state: typeof MessagesAnnotation.State) {
//     const lastMessage = state.messages.at(-1) as MessageWithToolCalls;
//     return lastMessage?.tool_calls?.length ? "Action" : "__end__";
//   }

//   // Build and return the graph
//   return new StateGraph(MessagesAnnotation)
//     .addNode("llmCall", llmCall)
//     .addNode("tools", toolNode)
//     .addEdge("__start__", "llmCall")
//     .addConditionalEdges(
//       "llmCall",
//       shouldContinue,
//       {
//         "Action": "tools",
//         "__end__": "__end__",
//       }
//     )
//     .addEdge("tools", "llmCall")
//     .compile();
// }

// const serviceAdapter = new LangChainAdapter({
//   chainFn: async ({ messages, tools, threadId }) => {
//     const agentGraph = createAgentGraph(tools);
//     const result = await agentGraph.invoke({ messages });
//     return result.messages[result.messages.length - 1];
//   }
// });

// const runtime = new CopilotRuntime();

// export const POST = async (req: NextRequest) => {
//   const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
//     runtime,
//     serviceAdapter,
//     endpoint: '/api/copilotkit',
//   });

//   return handleRequest(req);
// };