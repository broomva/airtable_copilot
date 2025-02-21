import { NextRequest } from 'next/server';
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  snippet?: string;
  score?: number;
  [key: string]: any;
}

interface TavilyResponse {
  results?: TavilyResult[];
  [key: string]: any;
}

// Initialize Tavily search tool on the server side
const searchTavily = new TavilySearchResults({
  maxResults: 3,
  apiKey: process.env.TAVILY_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await searchTavily.invoke(query) as TavilyResponse | TavilyResult[] | string;
    
    // Ensure we have an array of results with the correct structure
    let rawResults: TavilyResult[] = [];
    if (Array.isArray(response)) {
      rawResults = response;
    } else if (typeof response === 'string') {
      const parsed = JSON.parse(response) as TavilyResponse;
      rawResults = Array.isArray(parsed) ? parsed : parsed.results || [];
    } else if (response && typeof response === 'object' && 'results' in response) {
      rawResults = response.results || [];
    }

    // Format the results to match our SearchResult interface
    const formattedResults = rawResults.map(result => ({
      title: result.title || '',
      url: result.url || '',
      content: result.content || result.snippet || '',
      score: result.score || 1,
    }));

    return new Response(JSON.stringify({ results: formattedResults }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tavily search error:', error);
    return new Response(JSON.stringify({ error: 'Failed to perform search', results: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 