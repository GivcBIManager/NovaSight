/**
 * SchemaExplorer — tree-style warehouse schema browser.
 *
 * Displays database → schema → table → column hierarchy from
 * the ClickHouse warehouse introspection endpoints.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChevronRight,
  ChevronDown,
  Database,
  Table2,
  Columns3,
  Search,
  RefreshCw,
} from 'lucide-react'
import {
  useWarehouseSchemas,
  useWarehouseTables,
  useWarehouseColumns,
} from '../../hooks/useWarehouseSchema'

export interface SchemaExplorerProps {
  /** Called when a table is selected. */
  onTableSelect?: (schema: string, table: string) => void
  /** Called when a column is clicked. */
  onColumnClick?: (schema: string, table: string, column: string) => void
  maxHeight?: string
}

export function SchemaExplorer({
  onTableSelect,
  onColumnClick,
  maxHeight = '450px',
}: SchemaExplorerProps) {
  const [search, setSearch] = useState('')
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set())
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const { data: schemas = [], isLoading: schemasLoading, refetch } = useWarehouseSchemas()

  const toggleSchema = (schema: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev)
      if (next.has(schema)) next.delete(schema)
      else next.add(schema)
      return next
    })
  }

  const toggleTable = (key: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const filteredSchemas = search
    ? schemas.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : schemas

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schemas..."
            className="pl-7 h-7 text-xs"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => refetch()}
          disabled={schemasLoading}
        >
          <RefreshCw className={`h-3 w-3 ${schemasLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ScrollArea style={{ maxHeight }}>
        <div className="pr-2">
          {schemasLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading schemas...
            </p>
          ) : filteredSchemas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No schemas found.
            </p>
          ) : (
            filteredSchemas.map((schema) => (
              <SchemaNode
                key={schema.name}
                schema={schema.name}
                isExpanded={expandedSchemas.has(schema.name)}
                onToggle={() => toggleSchema(schema.name)}
                expandedTables={expandedTables}
                onToggleTable={toggleTable}
                onTableSelect={onTableSelect}
                onColumnClick={onColumnClick}
                search={search}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Schema Node ─────────────────────────────────────────────────────────────

interface SchemaNodeProps {
  schema: string
  isExpanded: boolean
  onToggle: () => void
  expandedTables: Set<string>
  onToggleTable: (key: string) => void
  onTableSelect?: (schema: string, table: string) => void
  onColumnClick?: (schema: string, table: string, column: string) => void
  search: string
}

function SchemaNode({
  schema,
  isExpanded,
  onToggle,
  expandedTables,
  onToggleTable,
  onTableSelect,
  onColumnClick,
  search,
}: SchemaNodeProps) {
  const { data: tables = [] } = useWarehouseTables(isExpanded ? schema : '')

  const filteredTables = search
    ? tables.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tables

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 w-full px-1 py-1 rounded hover:bg-accent text-sm"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <Database className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <span className="font-mono truncate">{schema}</span>
        {isExpanded && (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {filteredTables.length}
          </Badge>
        )}
      </button>

      {isExpanded && (
        <div className="ml-4">
          {filteredTables.map((table) => {
            const key = `${schema}.${table.name}`
            return (
              <TableNode
                key={key}
                schema={schema}
                table={table.name}
                isExpanded={expandedTables.has(key)}
                onToggle={() => onToggleTable(key)}
                onSelect={() => onTableSelect?.(schema, table.name)}
                onColumnClick={onColumnClick}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Table Node ──────────────────────────────────────────────────────────────

interface TableNodeProps {
  schema: string
  table: string
  isExpanded: boolean
  onToggle: () => void
  onSelect?: () => void
  onColumnClick?: (schema: string, table: string, column: string) => void
}

function TableNode({
  schema,
  table,
  isExpanded,
  onToggle,
  onSelect,
  onColumnClick,
}: TableNodeProps) {
  const { data: columns = [] } = useWarehouseColumns(
    isExpanded ? schema : '',
    isExpanded ? table : ''
  )

  return (
    <div>
      <button
        onClick={onToggle}
        onDoubleClick={onSelect}
        className="flex items-center gap-1.5 w-full px-1 py-0.5 rounded hover:bg-accent text-xs"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <Table2 className="h-3 w-3 text-green-500 shrink-0" />
        <span className="font-mono truncate">{table}</span>
      </button>

      {isExpanded && (
        <div className="ml-5">
          {columns.map((col) => (
            <button
              key={col.name}
              className="flex items-center gap-1.5 w-full px-1 py-0.5 rounded hover:bg-accent text-xs"
              onClick={() => onColumnClick?.(schema, table, col.name)}
            >
              <Columns3 className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="font-mono truncate flex-1 text-left">{col.name}</span>
              <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                {col.type}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
