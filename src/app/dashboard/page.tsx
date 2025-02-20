"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";

interface AirtableTable {
  id: string;
  name: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export default function DashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [baseId, setBaseId] = useState("");
  const [tables, setTables] = useState<AirtableTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action to scan Airtable base
  const handleScan = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/airtable/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey, baseId }),
      });

      if (!response.ok) {
        throw new Error("Failed to scan Airtable base");
      }

      const data = await response.json();
      setTables(data.tables);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useCopilotAction({
    name: "scanAirtableBase",
    description: "Scan the Airtable base to retrieve available tables",
    handler: handleScan,
  });

  // Action to select a table
  useCopilotAction({
    name: "selectTable",
    description: "Select an Airtable table to display",
    parameters: [
      {
        name: "tableName",
        type: "string",
        description: "The name of the table to select",
      },
    ],
    handler: ({ tableName }) => {
      setSelectedTable(tableName);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Airtable Dashboard</h1>
        
        {/* Configuration Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Airtable API Key
              </label>
              <Input
                type="password"
                placeholder="Enter your Airtable API key"
                value={apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Base ID
              </label>
              <Input
                placeholder="Enter your base ID"
                value={baseId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseId(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleScan}
              disabled={!apiKey || !baseId || loading}
            >
              {loading ? "Scanning..." : "Scan Base"}
            </Button>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Tables Selection */}
        {tables.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Available Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.name}>
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Table Data Display */}
        {selectedTable && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedTable} Data</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Table data will be implemented in the next step */}
              <p className="text-gray-500">Table data will be displayed here</p>
            </CardContent>
          </Card>
        )}
      </div>

      <CopilotSidebar
        defaultOpen={true}
        labels={{
          title: "Dashboard Assistant",
          initial: "Hi! I can help you connect to your Airtable base and explore the data.",
        }}
      />
    </div>
  );
} 