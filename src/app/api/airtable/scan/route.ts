import { NextRequest, NextResponse } from "next/server";

async function getAirtableTables(apiKey: string, baseId: string) {
  const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tables: ${response.statusText}`);
  }

  const data = await response.json();
  return data.tables;
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, baseId } = await req.json();

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: "API key and base ID are required" },
        { status: 400 }
      );
    }

    const tables = await getAirtableTables(apiKey, baseId);
    
    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error scanning Airtable base:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scan Airtable base" },
      { status: 500 }
    );
  }
} 