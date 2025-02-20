"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp, Github, Home, Settings, Pencil, Save, X, Search, ArrowUpDown, ChevronLeft, ChevronRight, Trash, Filter } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AirtableTable {
  id: string;
  name: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

interface AirtableRecord {
  id: string;
  fields: { [key: string]: any };
}

interface EditingCell {
  recordId: string;
  fieldName: string;
  value: string;
}

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  [key: string]: string;
}

export default function DashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [baseId, setBaseId] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [showCredentials, setShowCredentials] = useState(true);
  const [tables, setTables] = useState<AirtableTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<AirtableRecord[]>([]);
  const [selectedTableFields, setSelectedTableFields] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<FilterConfig>({});
  const [page, setPage] = useState(1);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const itemsPerPage = 10;

  // Initialize state from localStorage
  useEffect(() => {
    const storedApiKey = localStorage.getItem('airtableApiKey');
    const storedBaseId = localStorage.getItem('airtableBaseId');
    const storedSelectedTable = localStorage.getItem('airtableSelectedTable');

    if (storedApiKey) setApiKey(storedApiKey);
    if (storedBaseId) setBaseId(storedBaseId);
    if (storedSelectedTable) setSelectedTable(storedSelectedTable);
    if (storedApiKey) setShowCredentials(false);
  }, []);

  // Effect to load initial data if credentials exist
  useEffect(() => {
    if (apiKey && baseId) {
      handleScan();
    }
  }, [apiKey, baseId]);

  // Effect to load table data if table is selected
  useEffect(() => {
    if (selectedTable && tables.length > 0) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable, tables]);

  // Update localStorage when values change
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('airtableApiKey', apiKey);
    } else {
      localStorage.removeItem('airtableApiKey');
    }
  }, [apiKey]);

  useEffect(() => {
    if (baseId) {
      localStorage.setItem('airtableBaseId', baseId);
    } else {
      localStorage.removeItem('airtableBaseId');
    }
  }, [baseId]);

  useEffect(() => {
    if (selectedTable) {
      localStorage.setItem('airtableSelectedTable', selectedTable);
    } else {
      localStorage.removeItem('airtableSelectedTable');
    }
  }, [selectedTable]);

  // Modified setters to handle both state and localStorage
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApiKey(value);
  };

  const handleBaseIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBaseId(value);
  };

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
    handler: async ({ tableName }) => {
      setSelectedTable(tableName);
      await fetchTableData(tableName);
    },
  });

  const fetchTableData = async (tableName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/airtable/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey, baseId, tableName }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch table data");
      }

      const data = await response.json();
      setTableData(data.records);
      
      // Update selected table fields
      const table = tables.find(t => t.name === tableName);
      if (table) {
        setSelectedTableFields(table.fields);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Update table selection to fetch data
  const handleTableSelect = async (tableName: string) => {
    setSelectedTable(tableName);
    await fetchTableData(tableName);
  };

  const handleClearCredentials = () => {
    setApiKey("");
    setBaseId("");
    setSelectedTable("");
    setTables([]);
    setTableData([]);
    setSelectedTableFields([]);
    setShowCredentials(true);
  };

  const handleStartEdit = (recordId: string, fieldName: string, value: any) => {
    setEditingCell({
      recordId,
      fieldName,
      value: value?.toString() || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;

    try {
      setSaving(true);
      const record = tableData.find(r => r.id === editingCell.recordId);
      if (!record) return;

      const updatedFields = {
        ...record.fields,
        [editingCell.fieldName]: editingCell.value,
      };

      const response = await fetch("/api/airtable/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          baseId,
          tableName: selectedTable,
          recordId: editingCell.recordId,
          fields: updatedFields,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update record");
      }

      const updatedRecord = await response.json();
      setTableData(tableData.map(record => 
        record.id === updatedRecord.id ? updatedRecord : record
      ));
      setEditingCell(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update record");
    } finally {
      setSaving(false);
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let result = [...tableData];

    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value) {
        result = result.filter(record => 
          record.fields[field]?.toString().toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    // Apply search
    if (searchTerm) {
      result = result.filter(record =>
        Object.entries(record.fields).some(([_, value]) =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a.fields[sortConfig.field]?.toString() || '';
        const bValue = b.fields[sortConfig.field]?.toString() || '';
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
    }

    return result;
  }, [tableData, filters, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredAndSortedData.slice(start, start + itemsPerPage);
  }, [filteredAndSortedData, page]);

  const handleSort = (field: string) => {
    setSortConfig(current => ({
      field,
      direction: current?.field === field && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilter = (field: string, value: string) => {
    setFilters(current => ({
      ...current,
      [field]: value
    }));
    setPage(1); // Reset to first page when filtering
  };

  const handleBulkDelete = async () => {
    if (!selectedRecords.length) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch("/api/airtable/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          baseId,
          tableName: selectedTable,
          recordIds: selectedRecords,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete records");
      }

      // Clear selection and refresh table data
      setSelectedRecords([]);
      await fetchTableData(selectedTable);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete records");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Airtable Dashboard</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm hover:underline flex items-center gap-2">
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Button variant="outline" size="sm" asChild>
              <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
          </nav>
        </div>
      </header>

      <div className="container py-8">
        {/* Credentials Section */}
        <div className="mb-8">
          <TooltipProvider>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">Configuration</h2>
              {(apiKey || baseId) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-8 w-8"
                      onClick={() => setShowCredentials(!showCredentials)}
                    >
                      {showCredentials ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showCredentials ? 'Hide' : 'Show'} credentials</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>

          {/* Collapsible Credentials Form */}
          {showCredentials && (
            <Card className="mb-8">
              <CardContent className="space-y-4 pt-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Airtable API Key
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter your Airtable API key"
                    value={apiKey}
                    onChange={handleApiKeyChange}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Base ID
                  </label>
                  <Input
                    placeholder="Enter your base ID"
                    value={baseId}
                    onChange={handleBaseIdChange}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleScan}
                    disabled={!apiKey || !baseId || loading}
                  >
                    {loading ? "Scanning..." : "Scan Base"}
                  </Button>
                  {(apiKey || baseId) && (
                    <Button 
                      variant="outline"
                      onClick={handleClearCredentials}
                    >
                      Clear Credentials
                    </Button>
                  )}
                </div>
                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tables Selection */}
        {tables.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Available Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTable} onValueChange={handleTableSelect}>
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
              <div className="flex items-center justify-between">
                <CardTitle>{selectedTable} Data</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      placeholder="Search all columns..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      className="pl-10 w-[300px]"
                    />
                  </div>
                  {selectedRecords.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={saving}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading table data...</div>
              ) : error ? (
                <div className="text-red-500 py-4">{error}</div>
              ) : filteredAndSortedData.length === 0 ? (
                <div className="text-gray-500 py-4">No records found</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left">
                            <input
                              type="checkbox"
                              checked={selectedRecords.length === paginatedData.length}
                              onChange={(e) => {
                                setSelectedRecords(
                                  e.target.checked 
                                    ? paginatedData.map(r => r.id)
                                    : []
                                );
                              }}
                              className="rounded border-gray-300"
                            />
                          </th>
                          {selectedTableFields.map((field) => (
                            <th key={field.id} className="px-4 py-2 text-left font-medium">
                              <div className="flex items-center gap-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="-ml-3">
                                      {field.name}
                                      <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    <div className="p-2">
                                      <Input
                                        placeholder={`Filter ${field.name}...`}
                                        value={filters[field.name] || ''}
                                        onChange={(e) => handleFilter(field.name, e.target.value)}
                                        className="mb-2"
                                      />
                                    </div>
                                    <DropdownMenuItem onClick={() => handleSort(field.name)}>
                                      Sort {sortConfig?.field === field.name && sortConfig.direction === 'asc' 
                                        ? 'Descending' 
                                        : 'Ascending'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </th>
                          ))}
                          <th className="px-4 py-2 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((record) => (
                          <tr key={record.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={selectedRecords.includes(record.id)}
                                onChange={(e) => {
                                  setSelectedRecords(current => 
                                    e.target.checked
                                      ? [...current, record.id]
                                      : current.filter(id => id !== record.id)
                                  );
                                }}
                                className="rounded border-gray-300"
                              />
                            </td>
                            {selectedTableFields.map((field) => (
                              <td key={field.id} className="px-4 py-2">
                                {editingCell?.recordId === record.id && 
                                 editingCell?.fieldName === field.name ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell({
                                        ...editingCell,
                                        value: e.target.value,
                                      })}
                                      className="min-w-[200px]"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleSaveEdit}
                                      disabled={saving}
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleCancelEdit}
                                      disabled={saving}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 group">
                                    <span className="flex-1">
                                      {record.fields[field.name]?.toString() || ''}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleStartEdit(
                                        record.id,
                                        field.name,
                                        record.fields[field.name]
                                      )}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
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