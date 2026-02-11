/**
 * Schema Explorer Component
 * Sidebar for exploring database schemas, tables, and columns
 */

import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Database,
  Table2,
  Columns,
  Key,
  Link2,
  RefreshCw,
  Search,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { SchemaInfo, TableSchema, ColumnInfo } from '../types'

interface SchemaExplorerProps {
  schemas: SchemaInfo[]
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onColumnClick?: (tableName: string, columnName: string) => void
  onTableClick?: (tableName: string) => void
  className?: string
}

export function SchemaExplorer({
  schemas,
  isLoading = false,
  error,
  onRefresh,
  onColumnClick,
  onTableClick,
  className,
}: SchemaExplorerProps) {
  const [search, setSearch] = useState('')
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(['public', 'default']))
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev)
      if (next.has(schemaName)) {
        next.delete(schemaName)
      } else {
        next.add(schemaName)
      }
      return next
    })
  }

  const toggleTable = (tableKey: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev)
      if (next.has(tableKey)) {
        next.delete(tableKey)
      } else {
        next.add(tableKey)
      }
      return next
    })
  }

  // Filter schemas and tables based on search
  const filteredSchemas = schemas
    .map((schema) => ({
      ...schema,
      tables: schema.tables.filter(
        (table) =>
          table.name.toLowerCase().includes(search.toLowerCase()) ||
          table.columns.some((col) =>
            col.name.toLowerCase().includes(search.toLowerCase())
          )
      ),
    }))
    .filter((schema) => schema.tables.length > 0)

  return (
    <div className={cn('flex flex-col h-full bg-muted/30', className)}>
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Schema Explorer</h3>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Schema Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {error ? (
            <div className="text-center py-8 text-destructive text-sm">
              <p className="font-medium">Failed to load schema</p>
              <p className="text-xs mt-1 text-muted-foreground">{error}</p>
            </div>
          ) : isLoading && schemas.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading schema...
            </div>
          ) : filteredSchemas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {search ? 'No matching tables found' : 'No schemas available'}
            </div>
          ) : (
            filteredSchemas.map((schema) => (
              <SchemaNode
                key={schema.name}
                schema={schema}
                isExpanded={expandedSchemas.has(schema.name)}
                expandedTables={expandedTables}
                onToggle={() => toggleSchema(schema.name)}
                onTableToggle={toggleTable}
                onColumnClick={onColumnClick}
                onTableClick={onTableClick}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface SchemaNodeProps {
  schema: SchemaInfo
  isExpanded: boolean
  expandedTables: Set<string>
  onToggle: () => void
  onTableToggle: (tableKey: string) => void
  onColumnClick?: (tableName: string, columnName: string) => void
  onTableClick?: (tableName: string) => void
}

function SchemaNode({
  schema,
  isExpanded,
  expandedTables,
  onToggle,
  onTableToggle,
  onColumnClick,
  onTableClick,
}: SchemaNodeProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-1.5 text-sm rounded hover:bg-accent/50 group">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Database className="h-4 w-4 text-blue-500" />
        <span className="font-medium">{schema.name}</span>
        <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
          {schema.tables.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 border-l pl-2">
          {schema.tables.map((table) => {
            const tableKey = `${schema.name}.${table.name}`
            return (
              <TableNode
                key={tableKey}
                table={table}
                schemaName={schema.name}
                isExpanded={expandedTables.has(tableKey)}
                onToggle={() => onTableToggle(tableKey)}
                onColumnClick={onColumnClick}
                onTableClick={onTableClick}
              />
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface TableNodeProps {
  table: TableSchema
  schemaName: string
  isExpanded: boolean
  onToggle: () => void
  onColumnClick?: (tableName: string, columnName: string) => void
  onTableClick?: (tableName: string) => void
}

function TableNode({
  table,
  schemaName,
  isExpanded,
  onToggle,
  onColumnClick,
  onTableClick,
}: TableNodeProps) {
  const fullTableName = `${schemaName}.${table.name}`

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="flex items-center group">
        <CollapsibleTrigger className="flex items-center gap-1 flex-1 px-2 py-1 text-sm rounded hover:bg-accent/50">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <Table2 className="h-3.5 w-3.5 text-green-500" />
          <span>{table.name}</span>
          {table.rowCount !== undefined && (
            <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
              {table.rowCount.toLocaleString()}
            </span>
          )}
        </CollapsibleTrigger>
        {onTableClick && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => onTableClick(fullTableName)}
                >
                  <Columns className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Insert SELECT *</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <CollapsibleContent>
        <div className="ml-4 border-l pl-2">
          {table.columns.map((column) => (
            <ColumnNode
              key={column.name}
              column={column}
              tableName={fullTableName}
              onClick={onColumnClick}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface ColumnNodeProps {
  column: ColumnInfo
  tableName: string
  onClick?: (tableName: string, columnName: string) => void
}

function ColumnNode({ column, tableName, onClick }: ColumnNodeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="flex items-center gap-1.5 w-full px-2 py-1 text-sm rounded hover:bg-accent/50 text-left group"
            onClick={() => onClick?.(tableName, column.name)}
          >
            {column.isPrimaryKey ? (
              <Key className="h-3 w-3 text-yellow-500 flex-shrink-0" />
            ) : column.isForeignKey ? (
              <Link2 className="h-3 w-3 text-purple-500 flex-shrink-0" />
            ) : (
              <div className="w-3 h-3 flex-shrink-0" />
            )}
            <span className="truncate">{column.name}</span>
            <span className="ml-auto text-xs text-muted-foreground truncate max-w-[80px]">
              {column.type}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p>
              <strong>{column.name}</strong>
            </p>
            <p className="text-xs">Type: {column.type}</p>
            <p className="text-xs">Nullable: {column.nullable ? 'Yes' : 'No'}</p>
            {column.isPrimaryKey && <p className="text-xs text-yellow-500">Primary Key</p>}
            {column.isForeignKey && <p className="text-xs text-purple-500">Foreign Key</p>}
            {column.comment && <p className="text-xs text-muted-foreground">{column.comment}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
