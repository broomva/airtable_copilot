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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@radix-ui/react-dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { useCopilotChatSuggestions } from "@copilotkit/react-ui";

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

interface FilterCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty' | 'isNull' | 'isNotNull' | 'between' | 'in' | 'notIn';
  value: string;
  value2?: string; // For 'between' operator
  values?: string[]; // For 'in' and 'notIn' operators
}

interface FilterConfig {
  conditions: FilterCondition[];
  matchAll: boolean; // true for AND, false for OR
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filter: FilterCondition) => void;
  field: { name: string; type: string };
  operator: FilterCondition['operator'];
}

function FilterModal({ isOpen, onClose, onApply, field, operator }: FilterModalProps) {
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [values, setValues] = useState<string[]>([]);

  useEffect(() => {
    // Reset values when modal opens
    setValue('');
    setValue2('');
    setValues([]);
  }, [isOpen]);

  const handleApply = () => {
    if (operator === 'isNull' || operator === 'isNotNull' || 
        operator === 'isEmpty' || operator === 'isNotEmpty') {
      onApply({ field: field.name, operator, value: '' });
    } else if (operator === 'between') {
      onApply({ field: field.name, operator, value, value2 });
    } else if (operator === 'in' || operator === 'notIn') {
      onApply({ field: field.name, operator, value: values.join(','), values });
    } else {
      onApply({ field: field.name, operator, value });
    }
    onClose();
  };

  const renderInputFields = () => {
    switch (operator) {
      case 'isNull':
      case 'isNotNull':
      case 'isEmpty':
      case 'isNotEmpty':
        return null;
      case 'between':
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="min-value">Minimum value</Label>
              <Input
                id="min-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter minimum value"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max-value">Maximum value</Label>
              <Input
                id="max-value"
                value={value2}
                onChange={(e) => setValue2(e.target.value)}
                placeholder="Enter maximum value"
              />
            </div>
          </div>
        );
      case 'in':
      case 'notIn':
        return (
          <div className="grid gap-2">
            <Label htmlFor="values">Values (comma-separated)</Label>
            <Input
              id="values"
              value={values.join(', ')}
              onChange={(e) => setValues(e.target.value.split(',').map(v => v.trim()))}
              placeholder="Enter values separated by commas"
            />
          </div>
        );
      default:
        return (
          <div className="grid gap-2">
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Enter value for ${operator}`}
            />
          </div>
        );
    }
  };

  const getOperatorLabel = () => {
    switch (operator) {
      case 'equals': return 'Equals';
      case 'contains': return 'Contains';
      case 'startsWith': return 'Starts with';
      case 'endsWith': return 'Ends with';
      case 'greaterThan': return 'Greater than';
      case 'lessThan': return 'Less than';
      case 'between': return 'Between';
      case 'in': return 'In list';
      case 'notIn': return 'Not in list';
      case 'isNull': return 'Is null';
      case 'isNotNull': return 'Is not null';
      case 'isEmpty': return 'Is empty';
      case 'isNotEmpty': return 'Is not empty';
      default: return operator;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Filter: {field.name}</DialogTitle>
          <DialogDescription>
            {getOperatorLabel()} filter
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {renderInputFields()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FieldStatistics {
  totalRecords: number;
  nonNullCount: number;
  uniqueCount: number;
  numeric?: {
    min: number;
    max: number;
    mean: number;
    variance: number;
    stdDev: number;
  };
  categorical?: {
    topValues: Array<{ value: string; count: number }>;
    emptyCount: number;
  };
}

const calculateFieldStatistics = (data: AirtableRecord[], field: { name: string; type: string }): FieldStatistics => {
  const values = data.map(record => record.fields[field.name]);
  const nonNullValues = values.filter(v => v !== null && v !== undefined);
  const uniqueValues = new Set(nonNullValues.map(v => String(v)));

  const baseStats = {
    totalRecords: values.length,
    nonNullCount: nonNullValues.length,
    uniqueCount: uniqueValues.size,
  };

  if (field.type.toLowerCase() === 'number') {
    const numbers = nonNullValues.map(v => Number(v)).filter(n => !isNaN(n));
    if (numbers.length === 0) return baseStats;

    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;

    return {
      ...baseStats,
      numeric: {
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        mean: mean,
        variance: variance,
        stdDev: Math.sqrt(variance)
      }
    };
  } else {
    // For text and other types
    const valueCounts = nonNullValues.reduce((acc, val) => {
      const strVal = String(val);
      acc[strVal] = (acc[strVal] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topValues = Object.entries(valueCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([value, count]) => ({ value, count: count as number }));

    return {
      ...baseStats,
      categorical: {
        topValues,
        emptyCount: values.length - nonNullValues.length
      }
    };
  }
};

const formatStatistics = (stats: FieldStatistics, fieldType: string): string => {
  let result = `Records: ${stats.totalRecords}\n`;
  result += `Non-null: ${stats.nonNullCount}\n`;
  result += `Unique values: ${stats.uniqueCount}\n`;

  if (stats.numeric) {
    result += `\nNumeric Statistics:\n`;
    result += `Min: ${stats.numeric.min.toFixed(2)}\n`;
    result += `Max: ${stats.numeric.max.toFixed(2)}\n`;
    result += `Mean: ${stats.numeric.mean.toFixed(2)}\n`;
    result += `Std Dev: ${stats.numeric.stdDev.toFixed(2)}`;
  }

  if (stats.categorical) {
    result += `\nTop Values:\n`;
    stats.categorical.topValues.forEach(({ value, count }) => {
      result += `${value}: ${count} records\n`;
    });
    result += `Empty: ${stats.categorical.emptyCount} records`;
  }

  return result;
};

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  [key: string]: any;
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
  const [filters, setFilters] = useState<FilterConfig>({
    conditions: [],
    matchAll: true
  });
  const [page, setPage] = useState(1);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const itemsPerPage = 10;
  const [filterModal, setFilterModal] = useState<{
    isOpen: boolean;
    field: { name: string; type: string } | null;
    operator: FilterCondition['operator'] | null;
  }>({
    isOpen: false,
    field: null,
    operator: null,
  });
  const [isSearching, setIsSearching] = useState(false);

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

  // Enhanced filter handling
  const handleAddFilter = (condition: FilterCondition) => {
    setFilters(current => ({
      ...current,
      conditions: [...current.conditions, condition]
    }));
    setPage(1);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(current => ({
      ...current,
      conditions: current.conditions.filter((_, i) => i !== index)
    }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ conditions: [], matchAll: true });
    setPage(1);
  };

  const handleToggleFilterMode = () => {
    setFilters(current => ({
      ...current,
      matchAll: !current.matchAll
    }));
  };

  // Expose filter actions to Copilot
  useCopilotAction({
    name: "addFilter",
    description: "Add a filter condition to the table",
    parameters: [
      {
        name: "field",
        type: "string",
        description: "The field name to filter on",
      },
      {
        name: "operator",
        type: "string",
        description: "The filter operator (equals, contains, greaterThan, lessThan, startsWith, endsWith, isEmpty)",
      },
      {
        name: "value",
        type: "string",
        description: "The value to filter by",
      },
    ],
    handler: async ({ field, operator, value }) => {
      if (!selectedTableFields.some(f => f.name === field)) {
        throw new Error(`Field ${field} not found`);
      }
      handleAddFilter({ field, operator: operator as FilterCondition['operator'], value });
    },
  });

  useCopilotAction({
    name: "clearFilters",
    description: "Clear all active filters",
    handler: handleClearFilters,
  });

  useCopilotAction({
    name: "toggleFilterMode",
    description: "Toggle between AND/OR filter mode",
    handler: handleToggleFilterMode,
  });

  // Enhanced filter logic in filteredAndSortedData
  const filteredAndSortedData = useMemo(() => {
    let result = [...tableData];

    // Apply filters
    if (filters.conditions.length > 0) {
      result = result.filter(record => {
        const conditionResults = filters.conditions.map(condition => {
          const fieldValue = record.fields[condition.field]?.toString() ?? '';
          
          switch (condition.operator) {
            case 'equals':
              return fieldValue === condition.value;
            case 'contains':
              return fieldValue.toLowerCase().includes(condition.value.toLowerCase());
            case 'greaterThan':
              return Number(fieldValue) > Number(condition.value);
            case 'lessThan':
              return Number(fieldValue) < Number(condition.value);
            case 'startsWith':
              return fieldValue.toLowerCase().startsWith(condition.value.toLowerCase());
            case 'endsWith':
              return fieldValue.toLowerCase().endsWith(condition.value.toLowerCase());
            case 'isEmpty':
              return fieldValue === '';
            case 'isNotEmpty':
              return fieldValue !== '';
            case 'isNull':
              return fieldValue === null || fieldValue === undefined;
            case 'isNotNull':
              return fieldValue !== null && fieldValue !== undefined;
            case 'between':
              const num = Number(fieldValue);
              return num >= Number(condition.value) && num <= Number(condition.value2 ?? condition.value);
            case 'in':
              return condition.values?.includes(fieldValue) ?? false;
            case 'notIn':
              return !(condition.values?.includes(fieldValue) ?? false);
            default:
              return false;
          }
        });

        return filters.matchAll 
          ? conditionResults.every(Boolean)  // AND
          : conditionResults.some(Boolean);  // OR
      });
    }

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

  // Expose Airtable configuration to the agent
  useCopilotReadable({
    description: "The current Airtable configuration, including API key status and selected base",
    value: {
      hasApiKey: Boolean(apiKey),
      hasBaseId: Boolean(baseId),
      selectedTable,
      availableTables: tables.map(t => t.name),
    },
  });

  // Expose table structure to the agent
  useCopilotReadable({
    description: "The structure of the currently selected table, including field definitions",
    value: selectedTableFields.map(field => ({
      name: field.name,
      type: field.type,
    })),
  });

  // Expose current table state to the agent
  useCopilotReadable({
    description: "The current state of the table data, including filtering, sorting, and pagination",
    value: {
      totalRecords: tableData.length,
      currentPage: page,
      totalPages,
      itemsPerPage,
      searchTerm,
      sortConfig,
      filters,
      selectedRecords: selectedRecords.length,
    },
  });

  // Expose current UI state
  useCopilotReadable({
    description: "The current UI state, including loading, editing, and error states",
    value: {
      isLoading: loading,
      isSaving: saving,
      currentError: error,
      isEditing: Boolean(editingCell),
      editingField: editingCell ? {
        recordId: editingCell.recordId,
        fieldName: editingCell.fieldName,
      } : null,
      showingCredentials: showCredentials,
    },
  });

  // Update the Copilot readable state for filters
  useCopilotReadable({
    description: "The current filter configuration for the table",
    value: {
      activeFilters: filters.conditions.map(f => ({
        field: f.field,
        operator: f.operator,
        value: f.value
      })),
      filterMode: filters.matchAll ? 'AND' : 'OR',
      totalFilters: filters.conditions.length
    }
  });

  // Add new hook to expose selected rows data
  useCopilotReadable({
    description: "The currently selected rows in the table (limited to 10 rows for context)",
    value: {
      totalSelected: selectedRecords.length,
      selectedRows: selectedRecords.slice(0, 10).map(recordId => {
        const record = tableData.find(r => r.id === recordId);
        return record ? {
          id: record.id,
          fields: record.fields
        } : null;
      }).filter(Boolean),
      hasMoreSelected: selectedRecords.length > 10,
      message: selectedRecords.length > 10 
        ? `Note: Only showing first 10 of ${selectedRecords.length} selected rows for context`
        : undefined
    }
  });

  // Add new hook to expose top 3 records
  useCopilotReadable({
    description: "The top 3 records from the current view (respecting filters, sorting, and search)",
    value: {
      totalRecords: filteredAndSortedData.length,
      topRecords: filteredAndSortedData.slice(0, 3).map(record => ({
        id: record.id,
        fields: record.fields
      })),
      hasMoreRecords: filteredAndSortedData.length > 3,
      appliedFilters: filters.conditions.length > 0,
      searchApplied: Boolean(searchTerm),
      sortApplied: Boolean(sortConfig)
    }
  });

  const handleAddFilterWithValue = (field: { name: string; type: string }, operator: FilterCondition['operator']) => {
    if (operator === 'isNull' || operator === 'isNotNull' || 
        operator === 'isEmpty' || operator === 'isNotEmpty') {
      handleAddFilter({ field: field.name, operator, value: '' });
      return;
    }

    setFilterModal({
      isOpen: true,
      field,
      operator,
    });
  };

  // Update renderFilterMenu to use the new modal
  const renderFilterMenu = (field: { name: string; type: string }) => {
    const activeFilters = filters.conditions.filter(f => f.field === field.name);
    const fieldType = field.type.toLowerCase();
    
    return (
      <DropdownMenuContent align="start" className="w-72 bg-white border rounded-md shadow-lg">
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm font-semibold text-gray-700">Filters for {field.name}</span>
            {activeFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(current => ({
                  ...current,
                  conditions: current.conditions.filter(f => f.field !== field.name)
                }))}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear
              </Button>
            )}
          </div>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="w-full flex items-center px-3 py-2 text-sm rounded hover:bg-gray-100">
              <Filter className="h-4 w-4 mr-2" />
              Add Filter
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-white border rounded-md shadow-lg p-1">
              <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                onClick={() => handleAddFilterWithValue(field, 'equals')}>
                Equals...
              </DropdownMenuItem>
              <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                onClick={() => handleAddFilterWithValue(field, 'contains')}>
                Contains...
              </DropdownMenuItem>
              <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                onClick={() => handleAddFilterWithValue(field, 'startsWith')}>
                Starts with...
              </DropdownMenuItem>
              <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                onClick={() => handleAddFilterWithValue(field, 'endsWith')}>
                Ends with...
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-gray-200" />
              <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                onClick={() => handleAddFilterWithValue(field, 'isNull')}>
                Is Null
              </DropdownMenuItem>
              <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                onClick={() => handleAddFilterWithValue(field, 'isNotNull')}>
                Is Not Null
              </DropdownMenuItem>
              <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                onClick={() => handleAddFilterWithValue(field, 'isEmpty')}>
                Is Empty
              </DropdownMenuItem>
              <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                onClick={() => handleAddFilterWithValue(field, 'isNotEmpty')}>
                Is Not Empty
              </DropdownMenuItem>
              {fieldType === 'number' && (
                <>
                  <DropdownMenuSeparator className="my-1 border-gray-200" />
                  <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                    onClick={() => handleAddFilterWithValue(field, 'greaterThan')}>
                    Greater Than...
                  </DropdownMenuItem>
                  <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                    onClick={() => handleAddFilterWithValue(field, 'lessThan')}>
                    Less Than...
                  </DropdownMenuItem>
                  <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                    onClick={() => handleAddFilterWithValue(field, 'between')}>
                    Between...
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="my-1 border-gray-200" />
              <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                onClick={() => handleAddFilterWithValue(field, 'in')}>
                In List...
              </DropdownMenuItem>
              <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" 
                onClick={() => handleAddFilterWithValue(field, 'notIn')}>
                Not In List...
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {activeFilters.length > 0 && (
            <>
              <DropdownMenuSeparator className="border-gray-200" />
              <div className="space-y-2">
                <span className="text-sm text-gray-500 block px-3">Active Filters:</span>
                {activeFilters.map((filter, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded mx-2">
                    <span className="text-sm text-gray-700 flex-1">
                      {filter.operator === 'isNull' ? 'Is Null' :
                       filter.operator === 'isNotNull' ? 'Is Not Null' :
                       filter.operator === 'isEmpty' ? 'Is Empty' :
                       filter.operator === 'isNotEmpty' ? 'Is Not Empty' :
                       filter.operator === 'between' ? `Between ${filter.value} and ${filter.value2}` :
                       filter.operator === 'in' ? `In [${filter.values?.join(', ')}]` :
                       filter.operator === 'notIn' ? `Not In [${filter.values?.join(', ')}]` :
                       `${filter.operator} ${filter.value}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFilter(
                        filters.conditions.findIndex(f => 
                          f.field === field.name && 
                          f.operator === filter.operator && 
                          f.value === filter.value
                        )
                      )}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          <DropdownMenuSeparator className="border-gray-200" />
          <DropdownMenuItem className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => handleSort(field.name)}>
            Sort {sortConfig?.field === field.name && sortConfig.direction === 'asc' 
              ? 'Descending' 
              : 'Ascending'}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    );
  };

  // Add memoized field statistics
  const fieldStatistics = useMemo(() => {
    return selectedTableFields.reduce((acc, field) => {
      acc[field.name] = calculateFieldStatistics(tableData, field);
      return acc;
    }, {} as Record<string, FieldStatistics>);
  }, [tableData, selectedTableFields]);

  // Action to update selected records
  useCopilotAction({
    name: "updateSelectedRecords",
    description: "Update one or more fields in the selected records",
    parameters: [
      {
        name: "updates",
        type: "object",
        description: "An object containing field names and their new values",
      },
    ],
    handler: async ({ updates }) => {
      console.log('updates', updates);
      if (selectedRecords.length === 0) {
        throw new Error("No records selected. Please select at least one record to update.");
      }
      console.log('Running update with:', updates);

      try {
        setSaving(true);
        setError(null);

        // Process updates for each selected record
        const updatePromises = selectedRecords.map(async (recordId) => {
          const record = tableData.find(r => r.id === recordId);
          if (!record) return null;

          // Validate field names
          const invalidFields = Object.keys(updates).filter(
            fieldName => !selectedTableFields.some(f => f.name === fieldName)
          );

          if (invalidFields.length > 0) {
            throw new Error(`Invalid field names: ${invalidFields.join(", ")}`);
          }

          // Merge existing fields with updates
          const updatedFields = {
            ...record.fields,
            ...updates
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
              recordId,
              fields: updatedFields,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to update record ${recordId}`);
          }

          return response.json();
        });

        const results = await Promise.all(updatePromises);
        const successfulUpdates = results.filter(Boolean);

        // Update the table data with the new records
        setTableData(tableData.map(record => {
          const updatedRecord = successfulUpdates.find(u => u.id === record.id);
          return updatedRecord || record;
        }));

        // Clear selection after successful update
        setSelectedRecords([]);
        
        return `Successfully updated ${successfulUpdates.length} records`;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update records";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setSaving(false);
      }
    },
  });

  // Update Tavily search action to use the proxy API and render in chat
  useCopilotAction({
    name: "searchWeb",
    description: "Search the web using Tavily API to find relevant information",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query to look up",
      },
    ],
    handler: async ({ query }) => {
      try {
        setIsSearching(true);
        const response = await fetch("/api/tavily", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const data = await response.json();
        return data.results;
      } catch (error) {
        console.error('Search error:', error);
        throw new Error('Failed to perform web search');
      } finally {
        setIsSearching(false);
      }
    },
    render: ({ status, args, result }) => {
      if (status === 'inProgress') {
        return `Searching for "${args.query}"...`;
      }
      
      if (status === 'executing') {
        return "Fetching search results...";
      }

      if (!result || result.length === 0) {
        return "No results found.";
      }

      return (
        <div className="space-y-4 bg-white rounded-lg overflow-hidden">
          <h3 className="text-xl font-semibold px-4 pt-4">Web Search Results</h3>
          <div className="space-y-4 px-4 pb-4">
            {result.map((item: SearchResult, index: number) => (
              <div key={index} className="border-b pb-4 last:border-0">
                <a 
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {item.title}
                </a>
                <p className="text-sm text-gray-600 mt-1">{item.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Relevance score: {(item.score * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    },
  });

  // Expose search results to copilot
  useCopilotReadable({
    description: "The current web search results from Tavily",
    value: {
      isSearching,
    },
  });

  // Add chat suggestions based on dashboard state
  useCopilotChatSuggestions(
    {
      instructions: `
        Based on the current dashboard state, here are some suggested actions:
        ${selectedRecords.length > 0 
          ? `\n- Search for information about the ${selectedRecords.length} selected record(s)
             \n- Update values for the selected record(s)
             \n- Use information from the selected record to search the web and update the selected record values
             \n- Get statistics about the selected record(s)`
          : ''
        }
        ${selectedTable 
          // ? `\n- Get information about the "${selectedTable}" table structure
          //    \n- Search for best practices or documentation about ${selectedTable}
          //    \n- Analyze the table data distribution
          //    \n- Get field statistics for specific columns`
          // : ''
        }
        ${searchTerm 
          ? `\n- Refine the current search for "${searchTerm}"
             \n- Search the web for information related to "${searchTerm}"`
          : ''
        }
        ${filters.conditions.length > 0
          ? `\n- Modify or clear the current filters
             \n- Save this filter configuration
             \n- Search for records matching these filters`
          : ''
        }
        \n- Connect to a different Airtable base
        \n- Export or analyze the current data
        \n- Get help with Airtable formulas or field types
      `,
      minSuggestions: 1,
      maxSuggestions: 3,
    },
    [selectedRecords, selectedTable, searchTerm, filters]
  );

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
        {/* Web Search Results Section */}
        {/* Remove the search results card since we're showing results in chat */}

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
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="-ml-3">
                                            {field.name}
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-sm whitespace-pre-wrap bg-white p-4 rounded-md shadow-lg border">
                                        <div className="font-semibold mb-2">{field.name} ({field.type})</div>
                                        <div className="text-sm text-gray-600">
                                          {formatStatistics(fieldStatistics[field.name], field.type)}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  {renderFilterMenu(field)}
                                </DropdownMenu>
                              </div>
                            </th>
                          ))}
                          <th className="px-4 py-2 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((record) => (
                          <tr 
                            key={record.id} 
                            className={`border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                              selectedRecords.includes(record.id) ? 'bg-blue-50' : ''
                            }`}
                            onClick={(e) => {
                              // Don't trigger row selection when clicking edit button or input
                              if (
                                e.target instanceof HTMLElement && 
                                (e.target.closest('button') || e.target.closest('input'))
                              ) {
                                return;
                              }
                              setSelectedRecords(current => 
                                current.includes(record.id)
                                  ? current.filter(id => id !== record.id)
                                  : [...current, record.id]
                              );
                            }}
                          >
                            <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
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
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEdit(
                                          record.id,
                                          field.name,
                                          record.fields[field.name]
                                        );
                                      }}
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
        clickOutsideToClose={false}
        labels={{
          title: "Dashboard Assistant",
          initial: "Hi! I can help you connect to your Airtable base, explore the data, and search the web for relevant information.",
        }}
      />

      {/* Add FilterModal */}
      {filterModal.isOpen && filterModal.field && filterModal.operator && (
        <FilterModal
          isOpen={filterModal.isOpen}
          onClose={() => setFilterModal({ isOpen: false, field: null, operator: null })}
          onApply={handleAddFilter}
          field={filterModal.field}
          operator={filterModal.operator}
        />
      )}
    </div>
  );
} 