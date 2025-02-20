import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, baseId, tableName, recordIds } = await req.json();

    if (!apiKey || !baseId || !tableName || !recordIds?.length) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Delete records in batches of 10 (Airtable's limit)
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < recordIds.length; i += batchSize) {
      const batch = recordIds.slice(i, i + batchSize);
      batches.push(batch);
    }

    const results = await Promise.all(
      batches.map(async (batch) => {
        const queryString = batch.map((id: string) => `records[]=${id}`).join('&');
        const response = await fetch(
          `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?${queryString}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete records: ${response.statusText}`);
        }

        return response.json();
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error deleting records:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete records" },
      { status: 500 }
    );
  }
} 