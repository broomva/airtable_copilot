import {
  CopilotRuntime,
  LangChainAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { ChatOpenAI } from "@langchain/openai";
import { NextRequest } from 'next/server';
 
const model = new ChatOpenAI({ model: "gpt-4o", apiKey: process.env.OPENAI_API_KEY });
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